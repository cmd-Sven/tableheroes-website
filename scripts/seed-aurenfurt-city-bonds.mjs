/**
 * Ergänzt sinnvolle relationships für alle Aurenfurt-Stadt-NPCs (for_city_simulation),
 * sodass jeder mindestens 3 Kanten hat (outgoing+incoming). Idempotent.
 *
 * Dry-run: node scripts/seed-aurenfurt-city-bonds.mjs
 * Apply:   node scripts/seed-aurenfurt-city-bonds.mjs --apply
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    env[m[1]] = m[2].replace(/^"|"$/g, "").trim();
  }
  return env;
}

const APPLY = process.argv.includes("--apply");
const WORLD_ID = "689a0f11-7aa3-440b-9527-c6da0a84aebb";

const ID = {
  kaiser: "43ceede2-211f-8ee9-7cc8-5e2deb41e173",
  edward: "aaf40001-0001-4000-8000-000000000001",
  garrik: "aaf40001-0001-4000-8000-000000000002",
  aurill: "aaf40001-0001-4000-8000-000000000003",
  karolyn: "aaf40001-0001-4000-8000-000000000004",

  brann: "aad129c3-fe60-0738-5f8c-18860201788f",
  aldric: "4e07fbd5-f913-8f8a-e0e8-8a16586dd761",
  mikaro: "0a2da011-0455-b584-8cf7-9ee4fcc8910a",
  elowen: "10154799-c01b-ed15-b1d3-01acf1f659e0",
  seraphine: "b56bba46-4306-24fc-ee28-abeaf9e2874f",
  gretal: "9788af58-3e0b-3df3-4137-7848fc25d3d5",
  lyra: "e024e93e-6bc1-af68-c825-b76a418da33a",
  kael: "c72b9165-f8fe-ee00-64c6-1dae43dbcc2f",
  nessa: "ed80e0cf-cb9a-8ae9-1098-4d163c19c529",
  torvald: "78db793b-1d1b-5c95-a126-7f483148f055",

  selene: "1679c0b1-f5d9-f961-5684-5fb8235b0928",
  soren: "d65999c0-200e-3b78-f8fd-e83f5ef1c13a",
  findus: "aaf30001-0001-4000-8000-000000000001",
  ysolda: "9eb81fa6-b1cc-5214-0985-f95407eb56d5",
  gaysimir: "aaf30001-0001-4000-8000-000000000003",
  goward: "aaf30001-0001-4000-8000-000000000006",
  konrad: "aaf30001-0001-4000-8000-000000000004",
  drenn: "f5631dbe-7043-f7db-229d-04444c1604a1",
  valeria: "0e8d6afb-4ef4-f1ca-f358-bfe1bc081b09",
  lirian: "248a6092-1278-fcd2-7e72-84e698cafa99",
  coralie: "71621b7f-eb7c-c8c4-9f8d-12b5442d2bf0",
  rhessa: "0d4d3521-32b6-5211-a0b7-d998e5b4b8bb",
  thulus: "58220573-5190-cdf9-265e-48ad986008e0",
  borin: "d1388038-6318-ec43-b52f-7025edc29ebd",
  ratali: "aaf30001-0001-4000-8000-000000000007",
  robert: "aaf30001-0001-4000-8000-000000000009",
  sekur: "aaf30001-0001-4000-8000-000000000008",
  mael: "4f6126ff-cf39-e86e-df04-0eefc25968a5",
  sharlandi: "aaf30001-0001-4000-8000-000000000005",
  troldorksch: "aaf30001-0001-4000-8000-000000000002",
  vespera: "02ed144a-ceaa-d623-9f72-7914b85f4cea",
  tamrin: "bf9aba41-96ed-bd44-8b93-9fd1bee92ee3",
  fennel: "89e1c6a8-8c33-3ab3-55ec-e6d2ad992050",
};

/**
 * Bidirektionale Rollen: source_role aus Sicht source_id, target_role aus Sicht target_id.
 * Intensität −30…+80.
 */
const BONDS = [
  // ——— Stadtwachen / Tore / Schwertschule ———
  {
    source_id: ID.brann,
    target_id: ID.torvald,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 55,
    monologue_source: "Torvald hält das Nordtor — meine Kette endet dort.",
    monologue_target: "Branns Befehl gilt am Tor wie in der Wachstube.",
    is_public: true,
    public_description: "Stadtkommandant Brann und Torhauptmann Torvald.",
  },
  {
    source_id: ID.brann,
    target_id: ID.mael,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 50,
    monologue_source: "Das Löwentor ist Maels Posten — Südseite unter meiner Aufsicht.",
    monologue_target: "Brann setzt die Schicht; ich halte das Tor.",
    is_public: true,
    public_description: "Hauptmann Brann und Sergeant Mael am Löwentor.",
  },
  {
    source_id: ID.brann,
    target_id: ID.drenn,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 42,
    monologue_source: "Die Roten Gassen brauchen Drenns Härte — und meine Zügel.",
    monologue_target: "Brann will Ordnung; in den Gassen kostet das Blut und Nerven.",
    is_public: true,
    public_description: "Brann und Korporal Drenn (Wachstube Rote Gassen).",
  },
  {
    source_id: ID.brann,
    target_id: ID.thulus,
    source_role: "Auftraggeber",
    target_role: "Ausbilder",
    intensity: 48,
    monologue_source: "Thulus formt Klingenarme für die Wache — besser als jede Rede.",
    monologue_target: "Brann schickt Rekruten; ich schicke sie gehärtet zurück.",
    is_public: true,
    public_description: "Stadtwache und Schwertschule: Brann und Meister Thulus.",
  },
  {
    source_id: ID.brann,
    target_id: ID.edward,
    source_role: "Ausbilder",
    target_role: "Schüler",
    intensity: 62,
    monologue_source: "Der Kronprinz lernt bei mir Disziplin, bevor er den Thron lernt.",
    monologue_target: "Brann verlangt Gehorsam — genau das, was Vater will.",
    is_public: true,
    public_description: "Hauptmann Brann bildet Kronprinz Edward aus.",
  },
  {
    source_id: ID.brann,
    target_id: ID.aldric,
    source_role: "Kollege",
    target_role: "Kollege",
    intensity: 35,
    monologue_source: "Aldrics Siegel und meine Patrouillen halten dieselbe Stadt.",
    monologue_target: "Branns Berichte füllen meine Akten — und retten manchmal Leben.",
    is_public: false,
    public_description: "Stadtkommandant und Hofkanzlist arbeiten zusammen.",
  },
  {
    source_id: ID.torvald,
    target_id: ID.mael,
    source_role: "Kamerad",
    target_role: "Kamerad",
    intensity: 38,
    monologue_source: "Nord und Süd — zwei Tore, eine Pflicht.",
    monologue_target: "Torvald versteht Schicht und Stolz; wir tauschen Meldungen.",
    is_public: false,
    public_description: "Torwachen Nord und Süd: Torvald und Mael.",
  },
  {
    source_id: ID.torvald,
    target_id: ID.drenn,
    source_role: "Kamerad",
    target_role: "Kamerad",
    intensity: 28,
    monologue_source: "Drenn kämpft in den Gassen; ich am Stein — beide für Brann.",
    monologue_target: "Torvald hält Adelstor; ich halte den Abschaum draußen — oft.",
    is_public: false,
    public_description: "Wachen Torvald und Drenn unter Branns Kommando.",
  },
  {
    source_id: ID.mael,
    target_id: ID.drenn,
    source_role: "Kamerad",
    target_role: "Kamerad",
    intensity: 30,
    monologue_source: "Drenn kennt die Roten Gassen; ich brauche seine Warnungen am Südtor.",
    monologue_target: "Maels Tor ist sauberer als meine Gassen — und das ist gut so.",
    is_public: false,
    public_description: "Sergeant Mael und Korporal Drenn.",
  },
  {
    source_id: ID.thulus,
    target_id: ID.edward,
    source_role: "Lehrmeister",
    target_role: "Schüler",
    intensity: 55,
    monologue_source: "Edward hat Stahl im Arm — und noch mehr zu lernen.",
    monologue_target: "Thulus misst mich am Schwert, nicht am Titel.",
    is_public: true,
    public_description: "Drillmeister Thulus und Kronprinz Edward an der Schwertschule.",
  },
  {
    source_id: ID.thulus,
    target_id: ID.torvald,
    source_role: "Ausbilder",
    target_role: "Kamerad",
    intensity: 32,
    monologue_source: "Torvalds Leute üben hier, bevor sie Wache stehen.",
    monologue_target: "Thulus schärft mehr als Klingen — er schärft Haltung.",
    is_public: false,
    public_description: "Schwertschule und Nordtor-Wache.",
  },

  // ——— Kirche Elysia / Silberne Rose / Karolyn ———
  {
    source_id: ID.karolyn,
    target_id: ID.elowen,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 70,
    monologue_source: "Elowen hält die offenen Höfe im Licht — unter meinem Siegel.",
    monologue_target: "Die Kaiserin führt die Kirche; ich führe die Straßenandacht.",
    is_public: true,
    public_description: "Kaiserin Karolyn und Priorin Elowen (Silberne Rose).",
  },
  {
    source_id: ID.karolyn,
    target_id: ID.mikaro,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 65,
    monologue_source: "Mikaros Kapelle am Hof hält den Palast im Gebet.",
    monologue_target: "Karolyn ist Oberhaupt; ich diene Kelch und Rose.",
    is_public: true,
    public_description: "Kaiserin Karolyn und Hofkapellan Mikaro.",
  },
  {
    source_id: ID.elowen,
    target_id: ID.aurill,
    source_role: "Mentor",
    target_role: "Schüler",
    intensity: 58,
    monologue_source: "Aurill lernt Gnade in den Höfen — so bleibt das Haus menschlich.",
    monologue_target: "Elowen zeigt mir, was Predigt jenseits des Throns bedeutet.",
    is_public: true,
    public_description: "Priorin Elowen und Prinzessin Aurill.",
  },
  {
    source_id: ID.mikaro,
    target_id: ID.aurill,
    source_role: "Mentor",
    target_role: "Schüler",
    intensity: 50,
    monologue_source: "Aurill übt Kelch und Wort — ich hüte den Rhythmus.",
    monologue_target: "Mikaro kennt Hof und Altar; beides brauche ich.",
    is_public: false,
    public_description: "Hofkapellan Mikaro und Novizin Aurill.",
  },
  {
    source_id: ID.elowen,
    target_id: ID.soren,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 45,
    monologue_source: "Soren hütet den Ostbrunnen — Opfer und Ordnung im Namen Elysias.",
    monologue_target: "Elowens Wort gilt am Brunnen wie in der Predigt.",
    is_public: true,
    public_description: "Priorin Elowen und Brunnenhüter Soren.",
  },
  {
    source_id: ID.mikaro,
    target_id: ID.soren,
    source_role: "Kollege",
    target_role: "Kollege",
    intensity: 34,
    monologue_source: "Sorens Brunnen und meine Kapelle speisen dasselbe Licht.",
    monologue_target: "Mikaro versteht Ritual; ich verstehe Wasser und Wünsche.",
    is_public: false,
    public_description: "Kapellan Mikaro und Brunnenhüter Soren.",
  },
  {
    source_id: ID.soren,
    target_id: ID.aurill,
    source_role: "Freund",
    target_role: "Freund",
    intensity: 40,
    monologue_source: "Aurill bringt Stille an den Brunnen — willkommen.",
    monologue_target: "Am Ostbrunnen lerne ich Demut ohne Hofgetöse.",
    is_public: false,
    public_description: "Brunnenhüter Soren und Prinzessin Aurill.",
  },
  {
    source_id: ID.elowen,
    target_id: ID.sharlandi,
    source_role: "Verbündeter",
    target_role: "Verbündeter",
    intensity: 40,
    monologue_source: "Sharlandis Bögen schützen Pilgerwege — im Geist der Rose.",
    monologue_target: "Elowens Segen liegt auf Holz und Sehne, die ich forme.",
    is_public: false,
    public_description: "Priorin Elowen und Bogenmacherin Sharlandi.",
  },
  {
    source_id: ID.mikaro,
    target_id: ID.sharlandi,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 22,
    monologue_source: "Pfeile für Tempelwachen — Sharlandi liefert sauber.",
    monologue_target: "Die Kapelle zahlt fair; ich bleibe der Rose nah.",
    is_public: false,
    public_description: "Kapelle und Bogenmacherwerkstatt.",
  },
  {
    source_id: ID.karolyn,
    target_id: ID.sharlandi,
    source_role: "Auftraggeber",
    target_role: "Untertan",
    intensity: 28,
    monologue_source: "Holzmagie im Dienst der Kirche — sparsam, aber treu.",
    monologue_target: "Die Kaiserin sieht Nutzen in meinem Handwerk.",
    is_public: false,
    public_description: "Kaiserin Karolyn und Sharlandi Jesspin.",
  },

  // ——— Chronos / Kael / Goldene Kapelle ———
  {
    source_id: ID.kael,
    target_id: ID.valeria,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 55,
    monologue_source: "Valeria hält die Goldene Kapelle im Takt der Kerzen.",
    monologue_target: "Numerus Kael setzt die Liturgie; ich zünde sie an.",
    is_public: true,
    public_description: "Numerus Kael und Küsterin Valeria (Goldene Kapelle).",
  },
  {
    source_id: ID.kael,
    target_id: ID.elowen,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -25,
    monologue_source: "Elowens offene Höfe weichen dem Zwang — gefährlich weich.",
    monologue_target: "Kaels Uhrwerk würgt Gnade; Elysia ist kein Chronometer.",
    is_public: false,
    public_description: "Spannung zwischen Chronos-Konklave und Silberner Rose.",
  },
  {
    source_id: ID.kael,
    target_id: ID.lyra,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -18,
    monologue_source: "Sterne lügen langsamer als Uhren — Lyra zu frei.",
    monologue_target: "Kael will Zwang; wir wollen klare Bahnen ohne Kerker.",
    is_public: false,
    public_description: "Numerus Kael und Magisterin Lyra — Ordnung vs. Sterne.",
  },
  {
    source_id: ID.valeria,
    target_id: ID.mikaro,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -22,
    monologue_source: "Mikaros Rose weicht dem Maß; Maß hält die Stadt.",
    monologue_target: "Valerias Kerzen zählen Stunden — ich zähle Seelen.",
    is_public: false,
    public_description: "Goldene Kapelle vs. Kapelle der Silbernen Rose.",
  },
  {
    source_id: ID.valeria,
    target_id: ID.karolyn,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -15,
    monologue_source: "Die Kaiserin führt Elysia; Chronos duldet das — vorerst.",
    monologue_target: "Valerias Ordnung kennt wenig Empathie; ich kenne zu viel.",
    is_public: false,
    public_description: "Küsterin Valeria und Kaiserin Karolyn — konfessionelle Spannung.",
  },
  {
    source_id: ID.valeria,
    target_id: ID.soren,
    source_role: "Rivale",
    target_role: "Kollege",
    intensity: -8,
    monologue_source: "Opfer am Brunnen ohne Uhr — nachlässig, aber geduldet.",
    monologue_target: "Valeria misst; ich hüte Wasser. Beide dienen der Stadt.",
    is_public: false,
    public_description: "Goldene Kapelle und Ostbrunnen — distanzierte Nachbarschaft.",
  },

  // ——— Handel / Haus der Seide ———
  {
    source_id: ID.seraphine,
    target_id: ID.nessa,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 58,
    monologue_source: "Nessa hält den Westmarkt — mein Arm auf dem Pflaster.",
    monologue_target: "Seraphine setzt Standgeld und Kurs; ich setze die Stände.",
    is_public: true,
    public_description: "Handelskonsulin Seraphine und Standmeisterin Nessa.",
  },
  {
    source_id: ID.seraphine,
    target_id: ID.coralie,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 52,
    monologue_source: "Coralies Salon spricht Seide lauter als jeder Bote.",
    monologue_target: "Seraphine hält die Fäden; ich sticke den Ruf der Nordhäuser.",
    is_public: true,
    public_description: "Seraphine und Salonmeisterin Coralie.",
  },
  {
    source_id: ID.seraphine,
    target_id: ID.sekur,
    source_role: "Auftraggeber",
    target_role: "Angestellter",
    intensity: 45,
    monologue_source: "Sekur beschafft, was Stand und Adel brauchen — diskret.",
    monologue_target: "Seraphines Aufträge zahlen gut und öffnen Türen.",
    is_public: false,
    public_description: "Handelskonsulin und Beschaffer Sekur Salvander.",
  },
  {
    source_id: ID.nessa,
    target_id: ID.coralie,
    source_role: "Kollege",
    target_role: "Kollege",
    intensity: 36,
    monologue_source: "Coralie braucht Stoff; ich brauche Kundschaft aus dem Salon.",
    monologue_target: "Nessas Markt liefert, was mein Salon veredelt.",
    is_public: false,
    public_description: "Westmarkt und Seidensalon — Haus der Seide.",
  },
  {
    source_id: ID.nessa,
    target_id: ID.sekur,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 30,
    monologue_source: "Sekur bringt Seltenes auf den Westmarkt — gegen Anteil.",
    monologue_target: "Nessa kennt Käufer; ich kenne Wege.",
    is_public: false,
    public_description: "Standmeisterin Nessa und Fixer Sekur.",
  },
  {
    source_id: ID.coralie,
    target_id: ID.sekur,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 40,
    monologue_source: "Sekurs Luxusware kleidet meinen Salon.",
    monologue_target: "Coralie zahlt in Ruf und Gold — beides zählt.",
    is_public: false,
    public_description: "Seidensalon und Beschaffer Sekur.",
  },
  {
    source_id: ID.seraphine,
    target_id: ID.gretal,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 25,
    monologue_source: "Zunft und Seide — Preise verhandeln, nicht Krieg führen.",
    monologue_target: "Seraphine will Margen; ich will faire Werkstattlöhne.",
    is_public: true,
    public_description: "Haus der Seide und Zunftbund — Handelsabkommen.",
  },
  {
    source_id: ID.nessa,
    target_id: ID.ratali,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 42,
    monologue_source: "Ratalis Brot hält den Markt satt — und die Stände ruhig.",
    monologue_target: "Nessa gibt mir Standrecht; ich gebe dem Markt Duft.",
    is_public: true,
    public_description: "Westmarkt und Meisterbäcker Ratali.",
  },

  // ——— Zunft / Schmiede ———
  {
    source_id: ID.gretal,
    target_id: ID.borin,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 60,
    monologue_source: "Borins Esse ist das Herz des Zunftbundes.",
    monologue_target: "Gretal setzt Preise und Pflichten; ich halte das Feuer.",
    is_public: true,
    public_description: "Zunftvögtin Gretal und Meisterschmied Borin.",
  },
  {
    source_id: ID.gretal,
    target_id: ID.troldorksch,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 38,
    monologue_source: "Troldorksch hämmert auf der Straße — zunftgeprüft, wenn er zahlt.",
    monologue_target: "Gretal duldet meinen Stand, solange das Siegel stimmt.",
    is_public: true,
    public_description: "Zunftbund und Straßenschmied Troldorksch.",
  },
  {
    source_id: ID.borin,
    target_id: ID.troldorksch,
    source_role: "Meister",
    target_role: "Schüler",
    intensity: 44,
    monologue_source: "Der Ork lernt Stahl ehrlich — besser als mancher Geselle.",
    monologue_target: "Borin zeigt Esse-Wahrheit; ich bringe Kraft.",
    is_public: false,
    public_description: "Große Schmiede und Straßenschmied — Meister und Lehrling.",
  },
  {
    source_id: ID.borin,
    target_id: ID.thulus,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 48,
    monologue_source: "Thulus braucht Klingen; ich brauche Abnehmer mit Disziplin.",
    monologue_target: "Borins Stahl hält länger als Prahlerei.",
    is_public: true,
    public_description: "Große Schmiede beliefert die Schwertschule.",
  },
  {
    source_id: ID.troldorksch,
    target_id: ID.ratali,
    source_role: "Freund",
    target_role: "Freund",
    intensity: 28,
    monologue_source: "Ratali tauscht Brot gegen Nägel — ehrlicher Handel.",
    monologue_target: "Troldorksch repariert meinen Ofen; ich fülle seinen Magen.",
    is_public: false,
    public_description: "Straßenschmied und Bäcker — Nachbarschaftshandel.",
  },

  // ——— Magie / Observatorium / Bibliothek ———
  {
    source_id: ID.lyra,
    target_id: ID.garrik,
    source_role: "Mentor",
    target_role: "Schüler",
    intensity: 68,
    monologue_source: "Garrik lernt Bahnen, nicht Thronsprüche — gut so.",
    monologue_target: "Lyra öffnet die Sternenkammer; Vater öffnet Türen.",
    is_public: true,
    public_description: "Magisterin Lyra und Prinz-Gelehrter Garrik.",
  },
  {
    source_id: ID.lyra,
    target_id: ID.selene,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 50,
    monologue_source: "Selene hütet Wissen, das Sterne allein nicht halten.",
    monologue_target: "Lyra setzt Prioritäten; ich setze Regale und Siegel.",
    is_public: true,
    public_description: "Zirkel des Observatoriums und Große Bibliothek.",
  },
  {
    source_id: ID.lyra,
    target_id: ID.robert,
    source_role: "Auftraggeber",
    target_role: "Geschäftspartner",
    intensity: 40,
    monologue_source: "Robert jagt Übersetzungen, die wir brauchen.",
    monologue_target: "Lyras Aufträge zahlen und füllen meine Regale.",
    is_public: false,
    public_description: "Magisterin Lyra und Bücherjäger Robert Kramm.",
  },
  {
    source_id: ID.selene,
    target_id: ID.garrik,
    source_role: "Kollege",
    target_role: "Schüler",
    intensity: 46,
    monologue_source: "Garrik liest schneller als mancher Magister — und fragt besser.",
    monologue_target: "Selene kennt jeden Kodex; ich kenne jede Frage.",
    is_public: false,
    public_description: "Archivarin Selene und Garrik Flammguard.",
  },
  {
    source_id: ID.selene,
    target_id: ID.robert,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 55,
    monologue_source: "Roberts Funde landen bei mir — geprüft, katalogisiert.",
    monologue_target: "Selene zahlt fair und hält Geheimnisse hinter Glas.",
    is_public: true,
    public_description: "Bibliothek und Bücherjäger — Ankaufspartnerschaft.",
  },
  {
    source_id: ID.robert,
    target_id: ID.garrik,
    source_role: "Freund",
    target_role: "Freund",
    intensity: 35,
    monologue_source: "Garrik teilt Leselisten; ich teile seltene Drucke.",
    monologue_target: "Robert findet, was ich nur ahne.",
    is_public: false,
    public_description: "Robert Kramm und Garrik — Bücherfreundschaft.",
  },
  {
    source_id: ID.selene,
    target_id: ID.konrad,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 32,
    monologue_source: "Konrads Relikte brauchen Kontext — den liefere ich.",
    monologue_target: "Selene entzaubert Gerüchte; das steigert den Preis ehrlich.",
    is_public: false,
    public_description: "Bibliothek und Antiquar Konrad Himmel.",
  },
  {
    source_id: ID.lyra,
    target_id: ID.gaysimir,
    source_role: "Verbündeter",
    target_role: "Verbündeter",
    intensity: 33,
    monologue_source: "Gaysimirs Mixturen ergänzen, was Sterne nicht heilen.",
    monologue_target: "Lyra braucht Reagenzien ohne Hofgeschwätz — ich liefere.",
    is_public: false,
    public_description: "Observatorium und Alchemist Gaysimir.",
  },

  // ——— Goldkelchen / Tavernen / Musik ———
  {
    source_id: ID.lirian,
    target_id: ID.goward,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 55,
    monologue_source: "Gowards Klang ist Goldkelchen-Markenzeichen.",
    monologue_target: "Lirian setzt Bühnen; ich setze Saiten.",
    is_public: true,
    public_description: "Meister Lirian und Instrumentenbauer Goward.",
  },
  {
    source_id: ID.lirian,
    target_id: ID.tamrin,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 50,
    monologue_source: "Tamrins Allee hält Stimmen warm und Zungen locker.",
    monologue_target: "Lirian will Lieder und Loyalität — beides kriegt er.",
    is_public: true,
    public_description: "Goldkelchen-Meister und Wirt Tamrin.",
  },
  {
    source_id: ID.lirian,
    target_id: ID.fennel,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 48,
    monologue_source: "Fennels Hirsch ist die andere Stimme der Gilde.",
    monologue_target: "Lirian duldet Konkurrenz unter seinem Banner.",
    is_public: true,
    public_description: "Lirian und Wirtin Fennel (Blauer Hirsch).",
  },
  {
    source_id: ID.tamrin,
    target_id: ID.fennel,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -12,
    monologue_source: "Fennel stiehlt mir Gäste mit Hirschbraten — freundlich.",
    monologue_target: "Tamrins Allee ist lauter; mein Hirsch ist gemütlicher.",
    is_public: false,
    public_description: "Taverne zur Allee vs. Blauer Hirsch — milde Rivalität.",
  },
  {
    source_id: ID.goward,
    target_id: ID.tamrin,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 40,
    monologue_source: "Tamrin braucht Musik; ich brauche Publikum.",
    monologue_target: "Goward füllt die Abende — und die Becher folgen.",
    is_public: true,
    public_description: "Goward spielt in Tamrins Taverne.",
  },
  {
    source_id: ID.goward,
    target_id: ID.fennel,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 36,
    monologue_source: "Auch der Hirsch zahlt für gute Saiten.",
    monologue_target: "Goward bringt Gäste, die länger bleiben.",
    is_public: true,
    public_description: "Goward und Fennel — Musik im Blauen Hirsch.",
  },
  {
    source_id: ID.lirian,
    target_id: ID.seraphine,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 28,
    monologue_source: "Seide sponsert Bühnen; Bühnen verkaufen Seide.",
    monologue_target: "Lirians Festlichkeiten sind teure, nützliche Bühnen.",
    is_public: false,
    public_description: "Goldkelchen und Haus der Seide — Sponsoring.",
  },
  {
    source_id: ID.fennel,
    target_id: ID.ratali,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 45,
    monologue_source: "Ratalis Brot und Kuchen halten meinen Hirsch voll.",
    monologue_target: "Fennel bestellt groß und pünktlich — Traumkunde.",
    is_public: true,
    public_description: "Blauer Hirsch und Bäckerei Finkenfauch.",
  },

  // ——— Rotes Auge / Unterwelt ———
  {
    source_id: ID.vespera,
    target_id: ID.findus,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 42,
    monologue_source: "Findus zahlt Schutz und schweigt — so bleibt er nützlich.",
    monologue_target: "Vesperas Schatten kauft meine Fundstücke — und meine Zunge.",
    is_public: false,
    public_description: "Rote Äbtissin Vespera und Hehler Findus.",
  },
  {
    source_id: ID.vespera,
    target_id: ID.rhessa,
    source_role: "Vorgesetzter",
    target_role: "Untertan",
    intensity: 58,
    monologue_source: "Rhessas Laterne ist Ohr und Nest des Auges.",
    monologue_target: "Vespera befiehlt; ich höre, was Betrunkene flüstern.",
    is_public: false,
    public_description: "Vespera und Laternenwirtin Rhessa.",
  },
  {
    source_id: ID.vespera,
    target_id: ID.drenn,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -30,
    monologue_source: "Drenn stampft durch meine Gassen — zu laut, zu treu.",
    monologue_target: "Vespera ist der Schatten hinter jeder Diebesnacht.",
    is_public: false,
    public_description: "Rotes Auge vs. Wachstube Rote Gassen.",
  },
  {
    source_id: ID.findus,
    target_id: ID.rhessa,
    source_role: "Informant",
    target_role: "Informant",
    intensity: 38,
    monologue_source: "Rhessa weiß, wer sucht; ich weiß, was gefunden wurde.",
    monologue_target: "Findus bringt Ware und Gerüchte — beides verkaufe ich weiter.",
    is_public: false,
    public_description: "Hehler Findus und Rote Laterne — Informationsnetz.",
  },
  {
    source_id: ID.findus,
    target_id: ID.sekur,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 18,
    monologue_source: "Sekur wäscht manches, was ich „finde“ — gegen Aufpreis.",
    monologue_target: "Findus liefert Rohmaterial; ich liefere Salonfähigkeit.",
    is_public: false,
    public_description: "Findus und Sekur — grauer Handel.",
  },
  {
    source_id: ID.rhessa,
    target_id: ID.drenn,
    source_role: "Informant",
    target_role: "Rivale",
    intensity: -10,
    monologue_source: "Drenn zahlt manchmal für Tipps — und verdächtigt mich trotzdem.",
    monologue_target: "Rhessa hilft, wenn es ihr nutzt; Vertrauen ist teuer.",
    is_public: false,
    public_description: "Laterne und Wache — gespannte Zweckbeziehung.",
  },

  // ——— Nordhäuser / Kanzlei / Gärten ———
  {
    source_id: ID.aldric,
    target_id: ID.konrad,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 36,
    monologue_source: "Konrads Funde brauchen Genehmigungen — die schreibe ich.",
    monologue_target: "Aldrics Siegel macht Relikte legal und teuer.",
    is_public: false,
    public_description: "Hofkanzlei und Antiquar Konrad.",
  },
  {
    source_id: ID.aldric,
    target_id: ID.ysolda,
    source_role: "Freund",
    target_role: "Freund",
    intensity: 30,
    monologue_source: "Ysoldas Gärten sind die einzige Ruhe zwischen Aktenbergen.",
    monologue_target: "Aldric versteht Formulare; ich verstehe Hecken — wir ergänzen uns.",
    is_public: false,
    public_description: "Schreiber Aldric und Gärtnerin Ysolda.",
  },
  {
    source_id: ID.ysolda,
    target_id: ID.konrad,
    source_role: "Kollege",
    target_role: "Kollege",
    intensity: 28,
    monologue_source: "Konrad gehört zu den Nordhäusern wie meine Blauen Gärten.",
    monologue_target: "Ysolda hält Prestige grün; ich halte es in Vitrinen.",
    is_public: true,
    public_description: "Häuser des Nordens: Ysolda und Konrad.",
  },
  {
    source_id: ID.ysolda,
    target_id: ID.coralie,
    source_role: "Kollege",
    target_role: "Kollege",
    intensity: 34,
    monologue_source: "Coralies Salon braucht Blumen; ich brauche adelige Gäste.",
    monologue_target: "Ysoldas Arrangements machen Seide lebendig.",
    is_public: true,
    public_description: "Blaue Gärten und Seidensalon — Nordviertel.",
  },
  {
    source_id: ID.konrad,
    target_id: ID.robert,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -14,
    monologue_source: "Robert jagt Kodizes, die ich lieber als Relikt verkaufe.",
    monologue_target: "Konrad treibt Preise für Schrott; ich will Text, nicht Staub.",
    is_public: false,
    public_description: "Antiquar vs. Bücherjäger — milde Marktrivalität.",
  },
  {
    source_id: ID.aldric,
    target_id: ID.seraphine,
    source_role: "Kollege",
    target_role: "Kollege",
    intensity: 24,
    monologue_source: "Seraphines Zölle brauchen Formulare — und meine Geduld.",
    monologue_target: "Aldric bremst und beschleunigt Handel mit Tinte.",
    is_public: false,
    public_description: "Hofkanzlei und Handelskonsulin.",
  },

  // ——— Straßenhändler / Querverbindungen ———
  {
    source_id: ID.findus,
    target_id: ID.gaysimir,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 20,
    monologue_source: "Gaysimir kauft „seltene“ Kräuter ohne zu viele Fragen.",
    monologue_target: "Findus bringt Rohstoffe; Herkunft ignoriere ich höflich.",
    is_public: false,
    public_description: "Findus und Gaysimir — Straßenhandel.",
  },
  {
    source_id: ID.gaysimir,
    target_id: ID.ratali,
    source_role: "Freund",
    target_role: "Freund",
    intensity: 32,
    monologue_source: "Ratali testet meine Mixturen an Teig — mutig.",
    monologue_target: "Gaysimirs Kräuter machen mein Brot legendär — und riskant.",
    is_public: false,
    public_description: "Alchemist und Bäcker — Experimentierfreundschaft.",
  },
  {
    source_id: ID.gaysimir,
    target_id: ID.selene,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 26,
    monologue_source: "Tinten und Konservierungsmittel für die Bibliothek — meine Rezepte.",
    monologue_target: "Gaysimir liefert, was Kodizes vor Feuchtigkeit schützt.",
    is_public: false,
    public_description: "Gaysimir beliefert die Große Bibliothek.",
  },
  {
    source_id: ID.nessa,
    target_id: ID.findus,
    source_role: "Rivale",
    target_role: "Rivale",
    intensity: -16,
    monologue_source: "Findus unterbietet legale Stände — ich dulde das nicht ewig.",
    monologue_target: "Nessa will Ordnung; Ordnung ist teuer für Fundstücke.",
    is_public: false,
    public_description: "Westmarkt-Ordnung vs. Hehlerstand Findus.",
  },
  {
    source_id: ID.sharlandi,
    target_id: ID.gretal,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 30,
    monologue_source: "Gretal erkennt Holzhandwerk als Zunftwert — endlich.",
    monologue_target: "Sharlandis Bögen sind Qualität; die Zunft will ihren Anteil.",
    is_public: true,
    public_description: "Bogenmacherin Sharlandi und Zunftvögtin Gretal.",
  },
  {
    source_id: ID.tamrin,
    target_id: ID.ratali,
    source_role: "Geschäftspartner",
    target_role: "Geschäftspartner",
    intensity: 38,
    monologue_source: "Ohne Ratalis Laibe bleibt die Allee hungrig und mürrisch.",
    monologue_target: "Tamrin bestellt täglich — zuverlässiger als mancher Adel.",
    is_public: true,
    public_description: "Taverne zur Allee und Bäckerei.",
  },
];

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function pairKey(a, b) {
  return [a, b].sort().join("|");
}

async function loadCityNpcs() {
  const { data, error } = await supabase
    .from("npcs")
    .select("id, name, role, title, city_faction_id")
    .eq("world_id", WORLD_ID)
    .eq("for_city_simulation", true)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function loadRelationships() {
  const { data, error } = await supabase
    .from("relationships")
    .select("id, source_id, target_id, source_role, target_role, intensity")
    .eq("world_id", WORLD_ID);
  if (error) throw new Error(error.message);
  return data ?? [];
}

function bondCounts(npcs, rels) {
  const counts = new Map(npcs.map((n) => [n.id, 0]));
  for (const r of rels) {
    if (counts.has(r.source_id)) counts.set(r.source_id, counts.get(r.source_id) + 1);
    if (counts.has(r.target_id)) counts.set(r.target_id, counts.get(r.target_id) + 1);
  }
  return counts;
}

async function insertBond(bond, existingPairs) {
  const key = pairKey(bond.source_id, bond.target_id);
  if (existingPairs.has(key)) {
    return { status: "skip", key };
  }
  if (!APPLY) {
    existingPairs.add(key);
    return { status: "dry", key };
  }
  const { data, error } = await supabase
    .from("relationships")
    .insert({
      world_id: WORLD_ID,
      source_id: bond.source_id,
      target_id: bond.target_id,
      target_type: "npc",
      source_role: bond.source_role,
      target_role: bond.target_role,
      intensity: bond.intensity,
      monologue_source: bond.monologue_source,
      monologue_target: bond.monologue_target,
      is_public: bond.is_public ?? false,
      affects_city_sim: true,
      public_description: bond.public_description ?? "",
      history: [],
    })
    .select("id")
    .single();
  if (error) throw new Error(`Insert ${key}: ${error.message}`);
  existingPairs.add(key);
  return { status: "insert", key, id: data.id };
}

async function main() {
  console.log(APPLY ? "APPLY mode" : "DRY-RUN mode (pass --apply to write)");
  console.log(`World: ${WORLD_ID}`);
  console.log(`Geplante Bonds: ${BONDS.length}`);

  const npcs = await loadCityNpcs();
  const relsBefore = await loadRelationships();
  const countsBefore = bondCounts(npcs, relsBefore);
  const belowBefore = npcs.filter((n) => (countsBefore.get(n.id) ?? 0) < 3);

  console.log(`\nStadt-NPCs: ${npcs.length}`);
  console.log(`Vorher <3 Bonds: ${belowBefore.length}`);
  for (const n of belowBefore) {
    console.log(`  ${countsBefore.get(n.id)}  ${n.name} (${n.role})`);
  }

  const existingPairs = new Set(
    relsBefore.map((r) => pairKey(r.source_id, r.target_id)),
  );

  // Dedupliziere BONDS selbst
  const seenPlan = new Set();
  const plan = [];
  for (const b of BONDS) {
    const k = pairKey(b.source_id, b.target_id);
    if (seenPlan.has(k)) {
      console.warn(`WARN: Duplikat im Plan übersprungen: ${k}`);
      continue;
    }
    if (b.source_id === b.target_id) {
      console.warn(`WARN: Self-Bond übersprungen: ${b.source_id}`);
      continue;
    }
    seenPlan.add(k);
    plan.push(b);
  }

  let inserted = 0;
  let skipped = 0;
  let dry = 0;
  console.log("\n=== Bonds ===");
  for (const b of plan) {
    const res = await insertBond(b, existingPairs);
    const label = `${b.source_role}↔${b.target_role} (${b.intensity})`;
    if (res.status === "skip") {
      skipped++;
      console.log(`  SKIP  ${label}`);
    } else if (res.status === "dry") {
      dry++;
      console.log(`  DRY   ${label}`);
    } else {
      inserted++;
      console.log(`  INSERT ${label}`);
    }
  }

  const relsAfter = APPLY ? await loadRelationships() : [
    ...relsBefore,
    ...plan
      .filter((b) => !relsBefore.some((r) => pairKey(r.source_id, r.target_id) === pairKey(b.source_id, b.target_id)))
      .map((b) => ({ source_id: b.source_id, target_id: b.target_id })),
  ];
  const countsAfter = bondCounts(npcs, relsAfter);
  const belowAfter = npcs.filter((n) => (countsAfter.get(n.id) ?? 0) < 3);

  console.log("\n=== Verifikation ===");
  console.log(`Inserted: ${inserted}, Skipped existing: ${skipped}, Dry planned: ${dry}`);
  console.log(`Nachher <3 Bonds: ${belowAfter.length}`);
  if (belowAfter.length) {
    for (const n of belowAfter) {
      console.log(`  FEHLT ${countsAfter.get(n.id)}  ${n.name}`);
    }
    process.exitCode = 1;
  } else {
    console.log("OK: 0 Stadt-NPCs mit <3 Beziehungen");
  }

  console.log("\nBeispiele (5 NPCs):");
  const samples = [
    ID.drenn,
    ID.findus,
    ID.selene,
    ID.borin,
    ID.lirian,
  ];
  const nameById = new Map(npcs.map((n) => [n.id, n.name]));
  for (const id of samples) {
    const edges = relsAfter.filter((r) => r.source_id === id || r.target_id === id);
    // For dry-run edges may lack roles — merge from plan + before
    const detail = [];
    for (const r of edges) {
      const other = r.source_id === id ? r.target_id : r.source_id;
      const fromDb = relsBefore.find(
        (x) => pairKey(x.source_id, x.target_id) === pairKey(r.source_id, r.target_id),
      );
      const fromPlan = plan.find(
        (x) => pairKey(x.source_id, x.target_id) === pairKey(r.source_id, r.target_id),
      );
      const src = fromDb?.source_role ?? fromPlan?.source_role ?? "?";
      const tgt = fromDb?.target_role ?? fromPlan?.target_role ?? "?";
      const inten = fromDb?.intensity ?? fromPlan?.intensity ?? "?";
      detail.push(`→ ${nameById.get(other) ?? other} (${src}/${tgt}, ${inten})`);
    }
    console.log(`\n${nameById.get(id)} [${countsAfter.get(id)}]:`);
    for (const line of detail) console.log(`  ${line}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
