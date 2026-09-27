/**
 * Deterministische Spielleiter-Synthese für die Aurenfurt-Karten-Panels.
 * Keine KI, keine Zufallswerte — dieselbe Eingabe ergibt denselben Text.
 * Clean-View-Texte: organische Prosa ohne Ziffern; Analyse behält Zahlen.
 */

import type { ActiveInfluence } from "./aurenfurt-history";
import type { KeyLocation } from "./aurenfurt-locations";
import { DISPOSITION_LABELS, type AurenfurtNpc } from "./aurenfurt-npcs";
import type { SimProfile } from "./aurenfurt-sim";
import type { DayWeather, WeatherKind } from "./aurenfurt-weather";

export type BriefScope = "district" | "building";

export type PlaceBriefInput = {
  placeName: string;
  scope: BriefScope;
  weather: DayWeather;
  sim: SimProfile;
  location?: KeyLocation | null;
  operator?: AurenfurtNpc | null;
  leaders?: AurenfurtNpc[];
  influences?: ActiveInfluence[];
};

export type PlaceBrief = {
  /** Stimmungsteile für getrennte Pills / Trenner */
  moodParts: string[];
  /** Joined mit Mittelpunkt — Abwärtskompatibilität */
  moodLabel: string;
  /** 2–4 Sätze Zustandstext ohne Ziffern */
  statusText: string;
  /** Maximal 3 Prosa-Sorgenzeilen ohne Ziffern */
  concerns: string[];
  /** Lesbarer Korrelationshinweis für den Analyse-Tab (mit Zahlen) */
  correlationHint: string;
};

const WET: ReadonlySet<WeatherKind> = new Set(["rain", "storm", "snow", "fog"]);
const COLD: ReadonlySet<WeatherKind> = new Set(["frost", "snow", "fog"]);

function wetCold(weather: DayWeather) {
  return WET.has(weather.kind) || (COLD.has(weather.kind) && weather.tempC <= 6);
}

function topCell(sim: SimProfile) {
  if (sim.underground.length === 0) return null;
  return sim.underground.reduce((best, cell) => (cell.strength > best.strength ? cell : best));
}

function joinMood(parts: string[]) {
  return parts.join(" · ");
}

/** Qualitative Wetterphrase ohne Gradzahl (kleingeschrieben für Einbettung). */
export function weatherProse(weather: DayWeather): string {
  const live = weather.source === "live" ? " (live)" : "";
  switch (weather.kind) {
    case "rain":
      return `schlägt Regen${live} auf Dächer und Laune`;
    case "storm":
      return `peitscht Sturm${live} über Gassen und Stimmen`;
    case "snow":
      return `hält Schnee${live} die Leute drinnen und die Straßen still`;
    case "frost":
      return `beißt Frost${live} in Finger und Türschwellen`;
    case "fog":
      return `macht Nebel${live} Gassen und Gesichter undeutlich`;
    case "heat":
      return `macht Hitze${live} Stimmen scharf und Geduld kurz`;
    case "cloudy":
      return `dämpft bedeckter Himmel${live} das Licht über den Dächern`;
    default:
      return `liegt klarer Himmel${live} über den Dächern`;
  }
}

function weatherSuffix(weather: DayWeather): string {
  const live = weather.source === "live" ? " (live)" : "";
  switch (weather.kind) {
    case "rain":
      return `im Regen${live}`;
    case "storm":
      return `im Sturm${live}`;
    case "snow":
      return `im Schnee${live}`;
    case "frost":
      return `bei Frost${live}`;
    case "fog":
      return `im Nebel${live}`;
    case "heat":
      return `in der Hitze${live}`;
    case "cloudy":
      return `unter bedecktem Himmel${live}`;
    default:
      return `unter klarem Himmel${live}`;
  }
}

function placeWeatherLead(placeName: string, weather: DayWeather): string {
  return `In ${placeName} ${weatherProse(weather)}`;
}

function guildBelonging(placeName: string, guild: string): string {
  // Eigennamen bleiben unverändert; „von …“ liest sich mit Artikel-Namen am saubersten.
  return `${placeName} ist ein Ort von ${guild}`;
}

function vattrakClause(sim: SimProfile): string | null {
  if (sim.vattrak >= 70) {
    return "Vattraks weiße Magie liegt spürbar, aber dünn über dem Ort — Segen halten, ohne zu glänzen";
  }
  if (sim.vattrak >= 45) {
    return "Vattraks Schutz ist noch spürbar, doch die weiße Magie wirkt ausgedünnt";
  }
  if (sim.vattrak <= 25) {
    return "Vattraks weiße Magie reicht kaum noch aus: Kerzen flackern, Segen verhallen im Lärm";
  }
  return null;
}

function malanthirClause(sim: SimProfile, weather: DayWeather, hotspot: number): string | null {
  const inNeed =
    wetCold(weather) || sim.economy <= 40 || sim.refugees >= 60 || hotspot >= 60 || sim.crime >= 55;
  if (sim.malanthir >= 55 && inNeed) {
    return "In der Not wird Malanthir verlockend: Flüstern, verbotene Angebote, und wer hinsieht, sieht oft weg";
  }
  if (sim.malanthir >= 50) {
    return "Malanthir flüstert hinter verschlossenen Türen und zieht Schatten in die Gassen";
  }
  if (sim.malanthir >= 35 && inNeed) {
    return "Die dunkle Versuchung Malanthirs klingt leise mit, wo Armut und Unruhe aufeinandertreffen";
  }
  return null;
}

function guardClause(sim: SimProfile): string | null {
  if (sim.guard <= 25) {
    return "Die Stadtwachen sind so dünn, dass Hilfe oft zu spät kommt — Verzweiflung füllt die Lücken";
  }
  if (sim.guard <= 40) {
    return "Die Garde hält nur noch vereinzelte Posten; private Schutzgelder wirken attraktiver";
  }
  if (sim.guard >= 75) {
    return "Die Garde steht dicht und hält die Straßen sichtbar";
  }
  return null;
}

function refugeesClause(sim: SimProfile): string | null {
  if (sim.refugees >= 75) {
    return "Flüchtlinge drängen in Keller, Hinterhöfe und enge Zimmer";
  }
  if (sim.refugees >= 55) {
    return "Neue Ankömmlinge drücken auf Unterkunft und Geduld";
  }
  return null;
}

function economyClause(sim: SimProfile): string | null {
  if (sim.economy <= 30) {
    return "Brot und Arbeit sind knapp, Preise steigen, und wer zählt, bestellt zuletzt";
  }
  if (sim.economy <= 45) {
    return "Der Handel läuft zäh; niemand wirft Silbermünzen leichtfertig";
  }
  if (sim.economy >= 75) {
    return "Wohlstand hält die Läden offen und die Stimmen höflich";
  }
  return null;
}

function crimeClause(sim: SimProfile): string | null {
  if (sim.crime >= 70) {
    return "Diebstahl und Erpressung gehören zum Alltag; Gassen fühlen sich unsicher an";
  }
  if (sim.crime >= 55) {
    return "Misstrauen und leise Drohungen färben jedes Gespräch";
  }
  return null;
}

function unemploymentClause(sim: SimProfile): string | null {
  if (sim.unemployment >= 55) {
    return "Die Stadt zwingt Müßige an die Mauern, in die Schreibstuben und in die Wache, manche weiter an die Front — und doch werden die Gassen nicht leer";
  }
  if (sim.unemployment >= 35) {
    return "Wer ohne Auftrag bleibt, wird zu Reparaturen, Verwaltung und Patrouille gezogen; die Listen füllen sich schneller, als die Posten sie leeren";
  }
  if (sim.unemployment <= 22) {
    return "Die Zünfte und der Hof schlucken die Hände; freie Arbeit sucht man hier vergeblich";
  }
  return null;
}

function prosperityProse(level: number | undefined): string | null {
  if (level == null) return null;
  if (level <= 1) return "der Wohlstand ist dünn wie abgetragenes Tuch";
  if (level === 2) return "der Wohlstand reicht gerade für den Alltag";
  if (level === 3) return "der Wohlstand hält sich im Mittelmaß";
  if (level === 4) return "der Wohlstand zeigt sich in gepflegten Details";
  return "der Wohlstand liegt offen zutage";
}

function hotspotProse(hotspot: number, placeName: string): string | null {
  if (hotspot >= 75) return `${placeName} gilt als Brandherd — Unruhe brodelt sichtbar`;
  if (hotspot >= 60) return `Um ${placeName} verdichten sich Gerüchte und gespannte Blicke`;
  if (hotspot >= 45) return `${placeName} zieht Aufmerksamkeit an, ohne schon zu brennen`;
  return null;
}

function dispositionProse(operator: AurenfurtNpc): string {
  const role = operator.role || operator.title || "Betreiber";
  const label = DISPOSITION_LABELS[operator.disposition].toLowerCase();
  switch (operator.disposition) {
    case "feindselig":
      return `${role} wirkt feindselig — Tür und Blick bleiben eng`;
    case "misstrauisch":
      return `${role} wirkt misstrauisch und prüft jedes Wort`;
    case "bestechlich":
      return `${role} wirkt bestechlich; Silber öffnet Türen schneller als Bitten`;
    case "wohlwollend":
      return `${role} wirkt wohlwollend und hält den Ton entgegenkommend`;
    case "opportunistisch":
      return `${role} wirkt opportunistisch und wittert jeden Vorteil`;
    default:
      return `${role} wirkt ${label}`;
  }
}

function bonusProse(location: KeyLocation): string | null {
  const { name, effect } = location.specialBonus;
  const blob = `${name} ${effect}`.toLowerCase();
  if (/wucher|preis|stand|markt/.test(blob)) {
    return "Marktwucher und schwankende Preise färben Ware und Gerüchte";
  }
  if (/keller|flüster|auge|malanthir/.test(blob)) {
    return "Im Keller flüstert mehr als im Schankraum — verbotene Kontakte liegen nah";
  }
  if (/bestech|patrouille|wache|gold/.test(blob)) {
    return "Patrouillen lassen sich hier mit Gold oder Drohung abziehen";
  }
  if (/umschlag|schwarz|schmuggel/.test(blob)) {
    return "Ware ohne Siegel und Wege ohne Namen passieren hier ungesehen";
  }
  // Kurzer Prosa-Hinweis ohne Mechanik-Zahlen aus dem Effect-String
  return `${name} prägt den Alltag vor Ort`;
}

/** Stimmungsteile aus Metriken, Wetter und Disposition. */
export function deriveMoodParts(input: PlaceBriefInput): string[] {
  const { sim, weather, location, operator } = input;
  const wet = wetCold(weather);
  const disp = operator?.disposition;

  if (location && location.isHotspot >= 75) return ["Brandherd"];
  if (sim.crime >= 70 && sim.guard <= 30) return ["Gesetzlos", "Angespannt"];
  if (sim.malanthir >= 55) return ["Schattenhaft"];
  if (sim.economy <= 30 && wet) return ["Nass", "Leer"];
  if (sim.crime >= 60 && wet) return ["Misstrauisch", "Still"];
  if (sim.refugees >= 75) return ["Überfüllt"];
  if (sim.unemployment >= 60) return ["Zwangsarbeit", "Gedrückt"];
  if (sim.economy >= 75 && sim.guard >= 70) return ["Geordnet", "Wohlhabend"];
  if (sim.vattrak >= 70 && sim.crime <= 25) return ["Hofnah", "Ruhig"];
  if (disp === "feindselig") return ["Feindselig"];
  if (disp === "misstrauisch") return ["Misstrauisch"];
  if (disp === "bestechlich") return ["Käufliche Ruhe"];
  if (disp === "wohlwollend" && sim.crime <= 40) return ["Entgegenkommend"];
  if (sim.unemployment >= 45) return ["Arbeitsnot"];
  if (sim.economy <= 35) return ["Gedrückt"];
  if (sim.crime >= 55) return ["Angespannt"];
  if (weather.kind === "heat") return ["Schwül", "Reizbar"];
  if (wet) return ["Wettergeschlagen"];
  return ["Alltäglich", "Wach"];
}

/** @deprecated Nutze deriveMoodParts — bleibt als Join-Hilfe. */
export function deriveMoodLabel(input: PlaceBriefInput): string {
  return joinMood(deriveMoodParts(input));
}

/** Maximal drei akute Sorgen — nur Prosa, keine Zahlen. */
export function deriveConcerns(input: PlaceBriefInput): string[] {
  const { sim, location, influences = [] } = input;
  const lines: string[] = [];

  if (location && location.isHotspot >= 65) {
    lines.push(`Unruhen um ${location.name} brodeln sichtbar.`);
  }
  if (sim.crime >= 60) {
    lines.push("Gassen unsicher: Diebstahl und Erpressung gehören zum Alltag.");
  }
  if (sim.economy <= 35) {
    lines.push("Preise steigen; Arbeit und Brot werden knapp.");
  }
  if (sim.unemployment >= 55) {
    lines.push(
      "Müßige werden an Mauern, Schreibstuben und Wache gebunden — in der Stadt und an der Front; die Gassen bleiben trotzdem voll.",
    );
  }
  if (
    location &&
    (location.guildId === "haus-der-seide" ||
      /wucher|seide|stand/i.test(location.specialBonus.name) ||
      /wucher|preis|stand/i.test(location.specialBonus.effect))
  ) {
    lines.push("Marktwucher treibt Preise und Gerüchte auseinander.");
  }
  if (sim.refugees >= 70 && lines.length < 3) {
    lines.push("Lager und Gassen sind überfüllt; Unterkunft und Geduld knallen aufeinander.");
  }
  if (sim.malanthir >= 50 && lines.length < 3) {
    lines.push("Kult und Schmuggel drücken auf die Stimmung; Flüstern folgt der Not.");
  }
  if (sim.guard <= 30 && lines.length < 3) {
    lines.push("Patrouillen zu dünn — Hilfe kommt spät, private Schützer füllen Lücken.");
  }
  if (sim.vattrak <= 25 && sim.crime >= 50 && lines.length < 3) {
    lines.push("Hofnahe Ordnung greift hier kaum; Kerzen und Segen halten nicht stand.");
  }

  for (const influence of influences) {
    if (lines.length >= 3) break;
    if (/konfession|tempel|glaube|kirche|streit/i.test(`${influence.title} ${influence.summary}`)) {
      lines.push("Konfessionsstreit ist spürbar und spaltet Blicke und Gebete.");
    }
  }

  return lines.slice(0, 3);
}

function pushUnique(parts: string[], clause: string | null, max: number) {
  if (!clause || parts.length >= max) return;
  if (parts.some((part) => part.includes(clause.slice(0, 24)))) return;
  parts.push(clause.endsWith(".") ? clause : `${clause}.`);
}

function pickDistrictBody(sim: SimProfile, weather: DayWeather): string[] {
  /** Priorität: Magie-Konflikt und Notlage vor reiner Aufzählung. */
  const ranked: Array<{ weight: number; text: string }> = [];

  const crime = crimeClause(sim);
  if (crime) ranked.push({ weight: sim.crime >= 60 ? 86 : sim.crime * 0.7, text: crime });

  const economy = economyClause(sim);
  if (economy) ranked.push({ weight: sim.economy <= 35 ? 72 : 40, text: economy });

  const vattrak = vattrakClause(sim);
  if (vattrak) ranked.push({ weight: sim.vattrak <= 30 ? 93 : sim.vattrak >= 70 ? 70 : 45, text: vattrak });

  const malanthir = malanthirClause(sim, weather, 0);
  if (malanthir) {
    const needBoost = wetCold(weather) || sim.economy <= 40 || sim.refugees >= 60 || sim.crime >= 55 ? 12 : 0;
    ranked.push({ weight: sim.malanthir >= 50 ? 96 + needBoost : 50 + needBoost, text: malanthir });
  }

  const guard = guardClause(sim);
  if (guard) ranked.push({ weight: sim.guard <= 30 ? 91 : sim.guard <= 40 ? 75 : 48, text: guard });

  const refugees = refugeesClause(sim);
  if (refugees) ranked.push({ weight: sim.refugees >= 75 ? 78 : 55, text: refugees });

  const unemployment = unemploymentClause(sim);
  if (unemployment) {
    ranked.push({
      weight: sim.unemployment >= 55 ? 84 : sim.unemployment <= 22 ? 42 : 50,
      text: unemployment,
    });
  }

  ranked.sort((a, b) => b.weight - a.weight);

  const picked: string[] = [];
  for (const item of ranked) {
    if (picked.length >= 3) break;
    if (picked.some((part) => part.slice(0, 28) === item.text.slice(0, 28))) continue;
    picked.push(item.text.endsWith(".") ? item.text : `${item.text}.`);
  }
  return picked;
}

function buildDistrictStatus(input: PlaceBriefInput): string {
  const { placeName, sim, weather } = input;
  const parts: string[] = [placeWeatherLead(placeName, weather) + "."];
  parts.push(...pickDistrictBody(sim, weather));

  const cell = topCell(sim);
  if (cell && cell.strength >= 55 && parts.length < 4) {
    parts.push(`${cell.name} sitzt fest im Viertel und färbt Gerüchte und Wege.`);
  }

  return parts.slice(0, 4).join(" ");
}

function buildBuildingStatus(input: PlaceBriefInput): string {
  const { placeName, sim, weather, location, operator } = input;
  const parts: string[] = [];
  const guild = location?.guildName ?? "die örtliche Macht";
  const hotspot = location?.isHotspot ?? 0;

  const prosper = prosperityProse(location?.prosperityLevel);
  const opener = prosper
    ? `${guildBelonging(placeName, guild)}; ${prosper}.`
    : `${guildBelonging(placeName, guild)}.`;
  parts.push(opener);

  const hot = hotspotProse(hotspot, placeName);
  if (hot) {
    parts.push(`${hot} ${weatherSuffix(weather)}.`);
  } else {
    parts.push(`${placeWeatherLead(placeName, weather)}.`);
  }

  if (operator) {
    parts.push(`${dispositionProse(operator)}.`);
  }

  if (location) {
    const bonus = bonusProse(location);
    if (bonus) parts.push(`${bonus}.`);
  }

  if (parts.length < 4) {
    pushUnique(parts, malanthirClause(sim, weather, hotspot), 4);
  }
  if (parts.length < 4) {
    pushUnique(parts, unemploymentClause(sim), 4);
  }
  if (parts.length < 4) {
    pushUnique(parts, guardClause(sim), 4);
  }
  if (parts.length < 4 && wetCold(weather) && sim.crime >= 55) {
    parts.push("Bei nassem Wetter und Unruhe im Viertel sind die Gäste knapp und die Stimmen leise.");
  } else if (parts.length < 4) {
    pushUnique(parts, crimeClause(sim), 4);
  }

  const cleaned = parts
    .map((part) => part.replace(/\.\.+/g, ".").trim())
    .filter(Boolean)
    .slice(0, 4);

  return cleaned.join(" ");
}

/** Korrelationshinweis: Wetter × Metriken, konkrete Zahlen, deterministisch. */
export function buildCorrelationHint(input: PlaceBriefInput): string {
  const { sim, weather, location } = input;
  const sentences: string[] = [];
  const wet = wetCold(weather);
  const live = weather.source === "live" ? " live" : "";

  if (wet && sim.crime >= 55) {
    sentences.push(
      `Heute ${weather.label}${live} bei ${weather.tempC} °C und Kriminalität ${sim.crime}: Wirte werden kurz angebunden, Gassen leeren sich früher.`,
    );
  } else if (wet && sim.economy <= 40) {
    sentences.push(
      `${weather.label}${live} (${weather.tempC} °C) trifft auf Wirtschaft ${sim.economy}: weniger Laufkundschaft, härtere Preise.`,
    );
  } else if (weather.kind === "heat" && sim.crime >= 50) {
    sentences.push(
      `Hitze ${weather.tempC} °C${live} und Kriminalität ${sim.crime} machen Stimmen scharf und Hände schneller.`,
    );
  } else {
    sentences.push(
      `Wetter ${weather.label}${live} (${weather.tempC} °C) bei Kriminalität ${sim.crime} und Wirtschaft ${sim.economy} setzt den Grundton.`,
    );
  }

  if (sim.guard <= 35 && sim.crime >= 50) {
    sentences.push(
      `Garde nur ${sim.guard} bei hoher Kriminalität: Hilfe kommt spät, private Schutzgelder wirken attraktiver.`,
    );
  } else if (sim.unemployment >= 55) {
    sentences.push(
      `Arbeitslosigkeit ${sim.unemployment}: Zwangszuweisung an Mauern, Verwaltung und Wache (Stadt/Front) — die Gassen leeren sich trotzdem nicht.`,
    );
  } else if (sim.refugees >= 65 && sim.economy <= 45) {
    sentences.push(
      `Flüchtlinge ${sim.refugees} bei Wirtschaft ${sim.economy}: Unterkunft und Arbeit knallen aufeinander.`,
    );
  } else if (sim.malanthir >= 50) {
    sentences.push(
      `Malanthir ${sim.malanthir} korreliert mit leiseren Hinterzimmern und vorsichtigeren Auskünften.`,
    );
  }

  if (location && location.isHotspot >= 60) {
    sentences.push(
      `${location.name} (Hotspot ${location.isHotspot}, Gilde ${location.guildName}) verstärkt den Druck lokal.`,
    );
  } else if (location?.guildId === "haus-der-seide") {
    sentences.push(
      `Haus der Seide vor Ort: Stand- und Handelsdruck (${location.specialBonus.name}) färbt Preise und Gerüchte.`,
    );
  }

  return sentences.slice(0, 3).join(" ");
}

/** Reine Synthese: Zustand, Stimmung, Sorgen, Korrelation — ohne Halluzination. */
export function synthesizePlaceBrief(input: PlaceBriefInput): PlaceBrief {
  const moodParts = deriveMoodParts(input);
  return {
    moodParts,
    moodLabel: joinMood(moodParts),
    statusText: input.scope === "building" ? buildBuildingStatus(input) : buildDistrictStatus(input),
    concerns: deriveConcerns(input),
    correlationHint: buildCorrelationHint(input),
  };
}
