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
];

const FLAW_BY_ID = Object.fromEntries(CHARACTER_FLAWS.map((f) => [f.id, f])) as Record<
  string,
  CharacterFlawDefinition
>;

export function getFlawById(id: string): CharacterFlawDefinition | null {
  return FLAW_BY_ID[id] ?? null;
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
