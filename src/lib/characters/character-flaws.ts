export type CharacterFlawDefinition = {
  id: string;
  nr: number;
  name: string;
  mainDisadvantage: string;
  smallAdvantage: string;
  description: string;
  effects: string;
  roleplay: string;
};

export type CharacterFlawEntry = {
  flawId: string;
  story: string;
  /** Optionale Notiz zur SL-Freigabe (Rollenspiel-Situation). */
  grantedNote?: string;
};

export const CHARACTER_FLAWS: CharacterFlawDefinition[] = [
  {
    id: "burn_scars",
    nr: 1,
    name: "Großflächige Verbrennungen",
    mainDisadvantage: "−1 Charisma, Nachteil auf Überzeugen",
    smallAdvantage: "+2 Einschüchtern",
    description: "Dein Körper ist von dicken Brandnarben gezeichnet.",
    effects:
      "Dauerhaft −1 Charisma. Nachteil auf Überzeugen, wenn Narben sichtbar. Nachteil auf Rettungswürfe gegen extreme Kälte.",
    roleplay: "Du meidest offenes Feuer und fährst zusammen, wenn eine Fackel dir zu nahe kommt.",
  },
  {
    id: "chronic_limp",
    nr: 2,
    name: "Chronisches Humpeln",
    mainDisadvantage: "−5 Fuß Bewegung, Nachteil Akrobatik",
    smallAdvantage: "+2 Heilkunde",
    description: "Ein schlecht verheilter Knochenbruch behindert dich permanent.",
    effects: "Bewegungsrate −5 Fuß. Nachteil auf Akrobatik.",
    roleplay: "Du benutzt oft einen Gehstock. Dein Gang macht dich bei heimlichen Gruppenbewegungen laut.",
  },
  {
    id: "one_eyed",
    nr: 3,
    name: "Einäugig",
    mainDisadvantage: "Nachteil Fernkampf (weit), −2 Wahrnehmung",
    smallAdvantage: "+1 passive Wahrnehmung (Hinterhalte)",
    description: "Du hast ein Auge durch Kampf oder Unfall verloren.",
    effects:
      "Nachteil auf Fernkampf jenseits normaler Reichweite. −2 auf sichtbasierte Wahrnehmung.",
    roleplay: "Du musst den Kopf weit drehen. Das Einschenken von Getränken misslingt oft.",
  },
  {
    id: "shaking_hands",
    nr: 4,
    name: "Chronisches Händezittern",
    mainDisadvantage: "−3 Diebeswerkzeug, −1 Fernkampfschaden",
    smallAdvantage: "+2 Rettungswürfe gegen Paralyse",
    description: "Deine Hände zittern aufgrund von Nervenschäden oder Traumata.",
    effects: "−3 Diebeswerkzeug und Fingerfertigkeit. −1 Fernkampf-Schadenswürfe.",
    roleplay: "Dein Becher klappert beim Trinken. Deine Handschrift ist unleserlich.",
  },
  {
    id: "damaged_voice",
    nr: 5,
    name: "Beschädigte Stimmbänder",
    mainDisadvantage: "Keine verbale Magie bei Fesselung",
    smallAdvantage: "Vorteil Einschüchtern (Flüstern)",
    description: "Deine Stimme ist auf ein heiseres Krächzen reduziert.",
    effects:
      "Keine verbalen Zauberkomponenten bei eingeschränkter Bewegung. Nachteil auf Auftreten.",
    roleplay: "In lauten Tavernen wirst du überhört — Gestik oder lautes Schlagen auf Tische.",
  },
  {
    id: "deep_paranoia",
    nr: 6,
    name: "Tiefe Paranoia",
    mainDisadvantage: "−2 Rettungswürfe Furcht, −2 Überzeugen",
    smallAdvantage: "+2 Initiative, nicht überraschbar",
    description: "Du traust absolut niemandem — manchmal nicht einmal Freunden.",
    effects: "−2 gegen Verängstigt. −2 Überzeugen. +2 Initiative. Nicht überraschbar bei Bewusstsein.",
    roleplay: "Du schläfst mit dem Rücken zur Wand und prüfst Essen auf Gift.",
  },
  {
    id: "claustrophobia",
    nr: 7,
    name: "Klaustrophobie",
    mainDisadvantage: "Nachteil in Räumen < 10 Fuß",
    smallAdvantage: "+2 Initiative in engen Räumen",
    description: "Enge Gänge und kleine Räume schnüren dir die Kehle zu.",
    effects: "In Räumen enger als 10 Fuß: Nachteil auf alle Proben und Angriffe.",
    roleplay: "Du drängst in Höhlen nach vorne oder ganz nach hinten.",
  },
  {
    id: "glass_bones",
    nr: 8,
    name: "Glasknochen",
    mainDisadvantage: "Doppelter Fallschaden",
    smallAdvantage: "+1 Geschicklichkeits-Rettungswürfe",
    description: "Deine Knochen sind extrem spröde.",
    effects:
      "Doppelte Fallschadenswürfel. Bei Wuchtschaden > halbe max. TP: 1 Runde Betäubt.",
    roleplay: "Du bewegst dich vorsichtig und meidest riskantes Klettern.",
  },
  {
    id: "night_blindness",
    nr: 9,
    name: "Nachtblindheit",
    mainDisadvantage: "Blindheit im Dunkeln",
    smallAdvantage: "Immun gegen Blendeffekte",
    description: "Deine Augen passen sich nicht an Dunkelheit an.",
    effects: "Keine Dunkelsicht. In Dämmerung Abzüge wie totale Dunkelheit.",
    roleplay: "Ohne Fackel weigerst du dich, nachts vor die Tür zu gehen.",
  },
  {
    id: "hard_of_hearing",
    nr: 10,
    name: "Schwerhörigkeit",
    mainDisadvantage: "Nachteil akustische Wahrnehmung, −2 Initiative",
    smallAdvantage: "Resistenz Schall-Schaden",
    description: "Du hörst nur noch dumpfe Töne.",
    effects: "Nachteil auf hörbasierte Wahrnehmung. −2 Initiative. Resistenz Thunder.",
    roleplay: "Du sprichst oft zu laut und bittest um Wiederholungen.",
  },
  {
    id: "weak_immune",
    nr: 11,
    name: "Schwaches Immunsystem",
    mainDisadvantage: "Nachteil gegen Gifte/Krankheiten",
    smallAdvantage: "Vorteil Überlebenskunst (Kräuter)",
    description: "Dein Körper ist anfällig für Krankheiten und Toxine.",
    effects: "Nachteil auf Konstitutions-Rettungswürfe gegen Gifte, Krankheiten, Vergiftet.",
    roleplay: "Tuch vor dem Mund, zwanghaftes Händewaschen.",
  },
  {
    id: "acrophobia",
    nr: 12,
    name: "Höhenangst",
    mainDisadvantage: "Verängstigt > 20 Fuß Höhe",
    smallAdvantage: "+2 Wahrnehmung (Strukturen)",
    description: "Schon der Blick von einer Stadtmauer lässt den Kopf drehen.",
    effects: "Über 20 Fuß mit sichtbarer Tiefe: Zustand Verängstigt.",
    roleplay: "Du kriechst über Brücken und weigerst dich, Leitern zu klettern.",
  },
  {
    id: "phantom_pain",
    nr: 13,
    name: "Phantom-Schmerz",
    mainDisadvantage: "Gelegentlich keine Bonusaktion (W20=1)",
    smallAdvantage: "Vorteil gegen Folter/Schmerz",
    description: "Eine alte Wunde brennt in unregelmäßigen Abständen auf.",
    effects: "Kampfbeginn W20: Bei 1 keine Bonusaktion in Runde 1.",
    roleplay: "Du reibst dir Schulter oder Flanke und nimmst Kräutertinkturen.",
  },
  {
    id: "superstition",
    nr: 14,
    name: "Aberglaube",
    mainDisadvantage: "Nachteil bei schlechten Omen",
    smallAdvantage: "+2 Rettungswürfe gegen Flüche",
    description: "Du glaubst fest an Omen, Geister und Flüche.",
    effects: "Bei schlechtem Omen: 10 Min. Nachteil auf nächsten Rettungswurf.",
    roleplay: "Salz über die Schulter, Pflasterspalten meiden.",
  },
  {
    id: "animal_dread",
    nr: 15,
    name: "Tier-Schreck",
    mainDisadvantage: "Nachteil Umgang mit Tieren",
    smallAdvantage: "Bestien überraschen dich nie",
    description: "Tiere spüren eine unnatürliche Aura an dir.",
    effects: "Nachteil Animal Handling. Reittiere weigern sich oft.",
    roleplay: "Hunde bellen dich an. Du meidest Ställe.",
  },
  {
    id: "short_breath",
    nr: 16,
    name: "Kurzatmigkeit",
    mainDisadvantage: "Nachteil gegen Erschöpfung",
    smallAdvantage: "Spurt als Bonusaktion (1×/kurze Rast)",
    description: "Geschädigte Lunge oder schweres Asthma.",
    effects: "Nachteil auf Rettungswürfe gegen Erschöpfung durch Reisen/Hitze.",
    roleplay: "Nach Treppen musst du nach Luft ringen. Du verabscheust Gruften.",
  },
  {
    id: "color_blind",
    nr: 17,
    name: "Farbenblindheit",
    mainDisadvantage: "Nachteil bei farbabhängigen Proben",
    smallAdvantage: "Immun farbbasierte Illusionen",
    description: "Du siehst die Welt nur in Grau- und Brauntönen.",
    effects: "Automatisches Scheitern bei Proben, die Farben erfordern.",
    roleplay: "Du ziehst dich unpassend an und fragst ständig nach Trankfarben.",
  },
  {
    id: "arcane_static",
    nr: 18,
    name: "Arkanes Störsignal",
    mainDisadvantage: "Zauber kann bei W20=1 fehlschlagen",
    smallAdvantage: "+1 Rettungswürfe gegen Magie",
    description: "Deine Seele stößt die Fäden der Magie leicht ab.",
    effects: "Beim Zaubern W20: Bei 1 flackert der Zauber wirkungslos.",
    roleplay: "Artefakte summen in deiner Hand. Magier werden unruhig.",
  },
  {
    id: "glory_hunger",
    nr: 19,
    name: "Ruhmsucht",
    mainDisadvantage: "Muss Herausforderungen annehmen (WIS SG 13)",
    smallAdvantage: "+2 Rettungswürfe vor Publikum",
    description: "Dein Ego zwingt dich, dich ständig zu beweisen.",
    effects:
      "Bei öffentlicher Beleidigung: WIS-Rettungswurf SG 13 oder Herausforderung annehmen.",
    roleplay: "Du prahlst, trägst auffälligen Schmuck, nimmst unnötige Risiken.",
  },
  {
    id: "cold_shiver",
    nr: 20,
    name: "Zittern bei Kälte",
    mainDisadvantage: "Nachteil Angriffe unter Gefrierpunkt",
    smallAdvantage: "Resistenz Kälteschaden",
    description: "Deine Glieder schlottern bei kleinsten Kälteeinbrüchen.",
    effects: "Unter Gefrierpunkt: Nachteil auf Angriffswürfe mit physischen Waffen.",
    roleplay: "Dicke Mäntel im Sommer. Du meidest Schneegebiete.",
  },
  {
    id: "nervous_tick",
    nr: 21,
    name: "Nervöser Tick",
    mainDisadvantage: "Nachteil Auftreten, wenn beobachtet",
    smallAdvantage: "+2 Motiv erkennen",
    description: "Ein unwillkürlicher Tick verrät dich unter Druck.",
    effects:
      "Nachteil auf Auftreten in formellen oder beobachteten Situationen. +2 Motiv erkennen.",
    roleplay: "Augenlidzucken, Fingerklopfen oder zwanghaftes Räuspern — je peinlicher, desto stärker.",
  },
  {
    id: "speech_impediment",
    nr: 22,
    name: "Auffälliger Sprachfehler",
    mainDisadvantage: "Nachteil Überzeugen/Auftreten bei Fremden",
    smallAdvantage: "+2 Überzeugen unter einfachem Volk",
    description: "Ein deutlicher Sprachfehler prägt jede Unterhaltung.",
    effects:
      "Nachteil auf Überzeugen und Auftreten gegenüber Fremden/Adel. Beim Zaubern mit verbalen Komponenten: W20=1 → Zauber verschluckt. +2 Überzeugen in Kneipen und unter einfachem Volk (situativ).",
    roleplay: "Lispeln, Stottern oder Zungenfehler — du musst Sätze oft wiederholen.",
  },
  {
    id: "backwoods",
    nr: 23,
    name: "Hinterwäldlerisch",
    mainDisadvantage: "−2 Geschichte, −2 Religion",
    smallAdvantage: "+2 Überleben, +2 Naturkunde",
    description: "Stadt, Hofetikette und Gelehrsamkeit sind dir fremd.",
    effects: "−2 Geschichte, −2 Religion. +2 Überleben, +2 Naturkunde. Nachteil auf Etikette-/Hofproben (situativ).",
    roleplay: "Du misstraust Städtern, sprichst Dialekt und scheust Adel.",
  },
  {
    id: "substance_addiction",
    nr: 24,
    name: "Suchtkrank",
    mainDisadvantage: "Ohne Dosis: −1 KON & −1 WEI; nach 48 h +1 Erschöpfung",
    smallAdvantage: "+1 Wahrnehmung, +1 Initiative; unter Einfluss Vorteil gegen Furcht",
    description: "Dein Körper verlangt nach einer Substanz — ohne sie bricht alles zusammen.",
    effects:
      "Dauerhaft +1 Wahrnehmung und +1 Initiative. Nach 24 Stunden ohne Dosis: −1 Konstitution und −1 Weisheit (Attributswerte) bis zur nächsten Dosis. Nach 48 Stunden ohne Dosis zusätzlich +1 Stufe Erschöpfung. Unter Einfluss 1×/lange Rast: Vorteil gegen Furcht.",
    roleplay: "Zitternde Hände, Suche nach Dealern, riskante Wege zur nächsten Dosis.",
  },
  {
    id: "clumsy_motor",
    nr: 25,
    name: "Grobmotoriker",
    mainDisadvantage: "−2 Fingerfertigkeit, Nachteil Feinarbeit",
    smallAdvantage: "+1 Wuchtschaden Nahkampf (situativ)",
    description: "Feine Bewegungen enden oft in Chaos — Kraft ersetzt Präzision.",
    effects: "−2 Fingerfertigkeit. Nachteil auf akrobatische Feinarbeit. +1 Schaden bei Wuchtschlag-Nahkampfangriffen (situativ).",
    roleplay: "Zerbrochene Gläser, stolpern über Teppiche, „zu viel Kraft“.",
  },
  {
    id: "pogonophobia",
    nr: 26,
    name: "Pogonophobie",
    mainDisadvantage: "Furcht vor Bärten (WIS SG 12)",
    smallAdvantage: "+2 Wahrnehmung auf Verkleidung/Masken",
    description: "Bärte lösen in dir panische Ablehnung aus.",
    effects:
      "Gegen sichtbar bärtige Wesen: WIS SG 12 oder Verängstigt / Nachteil auf soziale Proben. +2 Wahrnehmung, Verkleidungen und Masken zu durchschauen (situativ).",
    roleplay: "Du weichst bartigen NPCs aus oder starrst sie fixiert an.",
  },
  {
    id: "entomophobia",
    nr: 27,
    name: "Entomophobie",
    mainDisadvantage: "Furcht vor Insekten (WIS SG 13)",
    smallAdvantage: "+2 Naturkunde (Insekten)",
    description: "Kriechendes und Summendes bringt dich außer Fassung.",
    effects:
      "Bei Insekten/Schwärmen in Sicht: WIS SG 13 oder Verängstigt / Nachteil auf Angriffe. +2 Naturkunde bezogen auf Insekten.",
    roleplay: "Schreie bei Spinnen, meidest Keller und schwärmende Wälder.",
  },
  {
    id: "gambling_addiction",
    nr: 28,
    name: "Spielsucht",
    mainDisadvantage: "−2 Motiv erkennen gegen Betrug; WIS SG 14 am Spieltisch",
    smallAdvantage: "+2 Fingerfertigkeit (Karten/Würfel)",
    description: "Glücksspiel zieht dich magnetisch an — oft gegen besseres Wissen.",
    effects:
      "Bei Glücksspiel: WIS SG 14 oder du setzt riskant. −2 Motiv erkennen gegen Betrug. +2 Fingerfertigkeit bei Karten und Würfeln.",
    roleplay: "Du kannst keinen Würfeltisch passieren und schuldest oft Geld.",
  },
  {
    id: "pathological_liar",
    nr: 29,
    name: "Pathologische Lüge",
    mainDisadvantage: "Nachteil Überzeugen, wenn Lüge auffliegt",
    smallAdvantage: "+2 Täuschen",
    description: "Die Wahrheit fällt dir schwerer als jede Erfindung.",
    effects: "+2 Täuschen. Nachteil auf Überzeugen, sobald eine Lüge von dir auffliegt (bis zur nächsten langen Rast).",
    roleplay: "Du lügst aus Gewohnheit — auch wenn die Wahrheit einfacher wäre.",
  },
  {
    id: "blood_rage",
    nr: 30,
    name: "Blutrausch",
    mainDisadvantage: "Unter ¼ TP: Angriffszwang (WIS SG 13)",
    smallAdvantage: "+2 Angriff unterhalb ¼ max. TP",
    description: "Wenn dein Blut aufkocht, siehst du nur noch den Kampf.",
    effects:
      "Unter ¼ der maximalen Trefferpunkte: +2 auf Angriffswürfe. Zu Kampfbeginn (oder wenn die Schwelle unterschritten wird): WIS SG 13 — bei Misslingen musst du in dieser Runde einen Gegner angreifen und hast Nachteil auf diesen Angriff. Triffst du unter Blutrausch keinen Gegner (Fehlschlag oder kein Ziel erreichbar), erleidest du automatisch 2 TP Schaden.",
    roleplay: "Glasige Augen, Kommandos verhallen — du willst nur noch zuschlagen.",
  },
  {
    id: "kleptomania",
    nr: 31,
    name: "Kleptomanie",
    mainDisadvantage: "WIS SG 12 in Läden/Lagern oder stehlen",
    smallAdvantage: "+2 Diebeswerkzeug / Fingerfertigkeit",
    description: "Kleine Dinge wandern wie von selbst in deine Taschen.",
    effects: "In Läden oder Lagern: WIS SG 12 oder du musst etwas stehlen. +2 Fingerfertigkeit.",
    roleplay: "„Nur ein kleiner Ring…“ — riskant auch bei Verbündeten.",
  },
  {
    id: "chronic_insomnia",
    nr: 32,
    name: "Chronische Schlaflosigkeit",
    mainDisadvantage: "Lange Rast heilt nur halb / drohende Erschöpfung",
    smallAdvantage: "+2 passive Wahrnehmung nachts",
    description: "Schlaf kommt selten und nie tief genug.",
    effects:
      "Nach einer langen Rast nur die Hälfte der normalen TP-Heilung (Aufrunden), oder 1 Stufe Erschöpfung, wenn du gar nicht schläfst. +2 auf die passive Wahrnehmung nachts.",
    roleplay: "Augenringe, Reizbarkeit, Selbstgespräche in der Nachtwache.",
  },
  {
    id: "authority_submissive",
    nr: 33,
    name: "Autoritätshörig",
    mainDisadvantage: "Nachteil Widerstand gegen Befehle (WIS)",
    smallAdvantage: "+2 Motiv erkennen (Hierarchien)",
    description: "Uniformen und Titel knicken deinen Willen ein.",
    effects:
      "Gegen erkennbare Befehlshaber/Offiziere: Nachteil auf WIS-Proben zum Widerstehen von Befehlen oder Einschüchterung. +2 Motiv erkennen in politischen/hierarchischen Situationen.",
    roleplay: "Du suchst immer „den Chef“ und knickst vor Autorität ein.",
  },
  {
    id: "megalomania",
    nr: 34,
    name: "Megalomanie",
    mainDisadvantage: "−2 auf Hilfe-/Teamwork-Proben",
    smallAdvantage: "+2 Einschüchtern, +2 Auftreten",
    description: "Nur du kannst die Welt retten — alle anderen sind Statisten.",
    effects: "−2 auf Proben, bei denen du einem Verbündeten aktiv hilfst (Hilfe-Aktion). +2 Einschüchtern, +2 Auftreten.",
    roleplay: "„Nur ich kann das!“ — du unterschätzt Verbündete und prahlst.",
  },
  {
    id: "scent_hypersensitive",
    nr: 35,
    name: "Geruchsüberempfindlich",
    mainDisadvantage: "Nachteil bei starkem Gestank",
    smallAdvantage: "+2 Wahrnehmung (Geruch)",
    description: "Gerüche treffen dich härter als jeden Schlag.",
    effects:
      "Bei starkem Gestank (Leichen, Schwefel, Abwasser): Nachteil auf Konzentration und Wahrnehmung. +2 auf geruchsbasierte Wahrnehmung (Gift, Rauch, Fallen).",
    roleplay: "Tuch vor der Nase, meidest Gerbereien und Gossen.",
  },
  {
    id: "pyromaniac",
    nr: 36,
    name: "Pyromane",
    mainDisadvantage: "WIS SG 13 bei offenem Feuer oder zünden",
    smallAdvantage: "+2 Arkane Kunde / Handwerk mit Feuer (situativ)",
    description: "Flammen faszinieren dich — oft gefährlich stark.",
    effects:
      "In Reichweite offenen Feuers oder mit Gelegenheit zu zünden: WIS SG 13 oder du entfachst/vergrößerst ein Feuer (oder handelst riskant damit). +2 auf Proben rund um Feuerkunde und Brandlegung (situativ).",
    roleplay: "Starrst in Flammen, spielst mit Kerzen, sammelst Zunder.",
  },
  {
    id: "narcissist",
    nr: 37,
    name: "Narzisstisch",
    mainDisadvantage: "−2 Motiv erkennen",
    smallAdvantage: "+1 Charisma, +2 Auftreten",
    description: "Die Welt dreht sich um dich — Kritik ist Beleidigung.",
    effects:
      "Dauerhaft +1 Charisma. +2 Auftreten. −2 Motiv erkennen. Bei öffentlicher Kritik: WIS SG 13 oder du eskalierst (Streit/Beleidigung).",
    roleplay: "Spiegel, Komplimente einfordern, Konkurrenz herabsetzen.",
  },
  {
    id: "narcolepsy",
    nr: 38,
    name: "Narkolepsie",
    mainDisadvantage: "Plötzliches Einnicken (W20=1)",
    smallAdvantage: "+2 Rettungswürfe gegen Schlaf-Zauber",
    description: "Schläfrigkeit überfällt dich ohne Vorwarnung.",
    effects:
      "Zu Beginn deines Zuges im Kampf W20: Bei 1 schläfst du bis zum Ende deines nächsten Zuges ein (oder bis Schaden dich weckt). −1 Initiative. +2 auf Rettungswürfe gegen magischen Schlaf.",
    roleplay: "Nickst in Gesprächen ein, suchst Softspots für Nickerchen.",
  },
  {
    id: "daydreamer",
    nr: 39,
    name: "Tagträumer",
    mainDisadvantage: "−2 Wahrnehmung, −2 Initiative",
    smallAdvantage: "+2 Arcana oder Religion (Grübeln, situativ)",
    description: "Dein Geist driftet oft in andere Welten ab.",
    effects: "−2 Wahrnehmung, −2 Initiative. Einmal pro kurzer Rast: Vorteil auf eine Wissensprobe (Arkane Kunde, Religion oder Geschichte), wenn du „nachdenken“ darfst.",
    roleplay: "Stierst ins Leere, verpasst Anweisungen, erwachst mit einem Ruck.",
  },
  {
    id: "seasick",
    nr: 40,
    name: "Seekrank",
    mainDisadvantage: "Nachteil auf Schiffen / schwankendem Grund",
    smallAdvantage: "+2 Überleben an der Küste",
    description: "Schon leichter Wellengang bringt dich aus dem Gleichgewicht.",
    effects:
      "Auf Schiffen, Booten oder stark schwankendem Untergrund: Nachteil auf Angriffe und Geschicklichkeitsproben. +2 Überleben in Küsten-/Hafenregionen.",
    roleplay: "Grünes Gesicht an Deck, meidest Fähren, klammerst dich an Reling.",
  },
];

const FLAW_BY_ID = Object.fromEntries(CHARACTER_FLAWS.map((f) => [f.id, f])) as Record<
  string,
  CharacterFlawDefinition
>;

export function getFlawById(id: string): CharacterFlawDefinition | null {
  return FLAW_BY_ID[id] ?? null;
}

export function getFlawByNr(nr: number): CharacterFlawDefinition | null {
  return CHARACTER_FLAWS.find((f) => f.nr === nr) ?? null;
}

/**
 * Optionaler Zufallswurf: 2W20 → Makel-Nr. 1–40.
 * Abbildung: ((W1 + W2 − 2) mod 40) + 1 — gleichmäßig über den Katalog.
 */
export function rollRandomFlawFrom2d20(excludeIds: Iterable<string> = []): {
  die1: number;
  die2: number;
  sum: number;
  flawNr: number;
  flaw: CharacterFlawDefinition | null;
} {
  const excluded = new Set(
    [...excludeIds].map((id) => String(id).trim()).filter(Boolean),
  );
  const rollDie = () => 1 + Math.floor(Math.random() * 20);

  for (let attempt = 0; attempt < 48; attempt++) {
    const die1 = rollDie();
    const die2 = rollDie();
    const sum = die1 + die2;
    const flawNr = ((sum - 2) % 40) + 1;
    const flaw = getFlawByNr(flawNr);
    if (!flaw) continue;
    if (excluded.has(flaw.id)) continue;
    return { die1, die2, sum, flawNr, flaw };
  }

  const fallback =
    CHARACTER_FLAWS.find((f) => !excluded.has(f.id)) ?? CHARACTER_FLAWS[0] ?? null;
  return {
    die1: 1,
    die2: 1,
    sum: 2,
    flawNr: fallback?.nr ?? 1,
    flaw: fallback,
  };
}

/** Maximale Anzahl wählbarer Makel (stufenunabhängig). */
export const MAX_CHARACTER_FLAWS = 3;

/** @deprecated Stufen-Gating entfernt — immer 3 Slots. */
export function maxFlawSlotsForLevel(_level?: number, _gmBonusSlots = 0): number {
  return MAX_CHARACTER_FLAWS;
}

export function parseCharacterFlaws(raw: unknown): CharacterFlawEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: CharacterFlawEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const flawId = String(r.flawId ?? r.flaw_id ?? "").trim();
    if (!flawId || !FLAW_BY_ID[flawId]) continue;
    out.push({
      flawId,
      story: String(r.story ?? "").trim(),
      grantedNote:
        r.grantedNote != null
          ? String(r.grantedNote).trim() || undefined
          : r.granted_note != null
            ? String(r.granted_note).trim() || undefined
            : undefined,
    });
  }
  return out.slice(0, 3);
}

export function flawUnlockHint(): string {
  return (
    "Du kannst bis zu 3 Makel wählen — keiner ist verpflichtend. " +
    "Der Spielleiter kann dir im Rollenspiel zusätzliche Makel zusprechen. " +
    "Wenn du einen Makel außerhalb des Kampfs gut ausspielst, wandelt der GM einen schwarzen Schicksalspunkt in einen weißen um."
  );
}

export function flawEmptyHint(): string {
  return (
    "Noch keinen Makel ausgewählt. Es steht dir ab Level 1 ein Makel zu, " +
    "weitere Makel in Absprache mit deinem SL möglich."
  );
}
