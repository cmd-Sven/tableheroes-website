/**
 * Anführer-Seeds je Fraktion (teilweise zugleich HQ-Betreiber).
 */

import type { NpcSeed } from "../aurenfurt-npc-types";

export const FACTION_LEADER_SEEDS: readonly NpcSeed[] = [
  {
    id: "npc-leader-rotes-auge",
    mapRoles: ["leader", "operator"],
    districtId: "unterstadt",
    factionId: "rotes-auge",
    locationId: "malanthir-umschlagplatz",
    name: "Vespera Nachtklaue",
    title: "Rote Äbtissin",
    role: "Anführerin des Roten Auges",
    race: "Halbelfin",
    alignment: "Neutral Evil",
    description:
      "Vespera führt das Malanthir-Netz der Unterstadt vom Umschlagplatz aus. Wer sie sieht, sieht oft nur einen Schatten zwischen Kisten.",
    appearance:
      "Schlank, aschfahle Haut, eine Narbe über dem linken Auge, dunkler Kapuzenmantel mit rotem Fadenstick.",
    personality_traits: "Ruhig, berechnend, selten laut — aber gnadenlos, wenn jemand ihre Routen verrät.",
    gm_notes: "Kennt bestochene Wachen in der Wachstube Rote Gassen; nutzt Goldkelchen-Gerüchte als Deckung.",
    true_nature: "Malanthir-Kultistin unter der Maske einer Schmuggelkönigin.",
    hidden_agenda: "Die Stadtwache weiter unterwandern und den Westmarkt mit Seidenhaus-Schulden lähmen.",
    secret_entry: "Im Keller des Umschlagplatzes lagert sie Reliquien, die kein Zoll jemals sehen darf.",
    hooks: [
      {
        name: "Kellerbote",
        role: "Kurier",
        description: "Ein Junge mit roter Laterne bringt Nachrichten nur nachts.",
        is_alive: true,
      },
      {
        name: null,
        role: "Rivalin",
        description: "Eine ehemalige Partnerin will den Umschlagplatz übernehmen.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Insight",
        dc: 16,
        result: "Ihre Höflichkeit maskiert Drohungen; sie misst, wer käuflich ist.",
        is_critical: false,
      },
      {
        type: "Investigation",
        dc: 18,
        result: "Rote Kreidespuren führen zu einem verdeckten Hof hinter dem Westmarkt.",
        is_critical: false,
      },
    ],
    influence: 82,
    loyalty: 48,
    agenda: "Malanthir-Ware fließen lassen, Wache kaufen, Seide erpressen.",
    darkSecret:
      "Sie hat einen Stadtwachen-Hauptmann erpresst: Seine Schwester liegt als Geisel in einem Malanthir-Keller.",
    intelValue: 88,
    disposition: "opportunistisch",
  },
  {
    id: "npc-leader-goldkelchen",
    mapRoles: ["leader", "operator"],
    districtId: "handwerkerviertel",
    factionId: "goldkelchen",
    locationId: "gauklerbuehne",
    name: "Lirian Goldkehle",
    title: "Meister der Goldkelchen",
    role: "Anführer der Goldkelchen",
    race: "Mensch",
    alignment: "Chaotic Neutral",
    description:
      "Lirian tanzt und singt auf der Gauklerbühne, während seine Barden Gerüchte für das Haus der Seide sammeln.",
    appearance:
      "Goldene Ohrringe, bunte Weste, geschwärzte Fingernägel vom Schminken; Stimme trägt über drei Gassen.",
    personality_traits: "Charmant, witzig, immer eine Strophe voraus — und nie ganz ehrlich.",
    gm_notes: "Client des Hauses der Seide; meidet offene Konflikte mit dem Roten Auge.",
    true_nature: "Spitzelnetz unter Bardenkutte.",
    hidden_agenda: "Adelsohren füttern und Seidenhaus-Aufträge priorisieren.",
    secret_entry: "Jedes Lied enthält Codezeilen für Kurierläufe.",
    hooks: [
      {
        name: "Mirena Flüsterton",
        role: "Bardin",
        description: "Spielt im Blauen Hirsch und lauscht Salon-Klatsch.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Persuasion",
        dc: 13,
        result: "Er teilt ein harmloses Gerücht — und behält das brisante zurück.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 15,
        result: "Seine Scherze lenken von Beobachtungen am Publikum ab.",
        is_critical: false,
      },
    ],
    influence: 58,
    loyalty: 62,
    agenda: "Informantennetz für Seide pflegen, ohne die Bühne zu verlieren.",
    darkSecret:
      "Er verkauft Namen von Flüchtlingen an das Haus der Seide — und behauptet, es sei nur Kunst.",
    intelValue: 79,
    disposition: "opportunistisch",
  },
  {
    id: "npc-leader-haus-der-seide",
    mapRoles: ["leader", "operator"],
    districtId: "handwerkerviertel",
    factionId: "haus-der-seide",
    locationId: "seidenkontor",
    name: "Seraphine Seidenhand",
    title: "Handelskonsulin",
    role: "Anführerin des Hauses der Seide",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description:
      "Seraphine führt das Kontor am Handwerkermarkt: hohe Standgelder, längere Arme bis in die blauen Salons.",
    appearance:
      "Silbernes Haar streng gebunden, Seidenhandschuhe, ein Siegelring mit Spinnweben-Motiv.",
    personality_traits: "Höflich, unnachgiebig, spricht in Preisen und Fristen.",
    gm_notes: "Patron der Goldkelchen; Rivalität zum Zunftbund und Druck auf Adelskontakte.",
    true_nature: "Macht durch Schulden und Standgebühren.",
    hidden_agenda: "Adelshäuser über Luxusware anbinden und Zunftverträge aushebeln.",
    secret_entry: "Die Kontorbücher führen zwei Spalten: öffentlich und erpresserisch.",
    hooks: [
      {
        name: "Torren Quill",
        role: "Buchhalter",
        description: "Kennt jede Standgebühr — und jede Ausnahme.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Insight",
        dc: 14,
        result: "Jedes Lächeln ist eine Rechnung, die noch nicht gestellt wurde.",
        is_critical: false,
      },
      {
        type: "Investigation",
        dc: 16,
        result: "Doppelte Quittungen im Kontor belegen erzwungene „Schutzspenden“.",
        is_critical: false,
      },
    ],
    influence: 76,
    loyalty: 71,
    agenda: "Handelsnetz und Adelsschulden ausbauen.",
    darkSecret:
      "Sie lässt Westmarkt-Diebstähle zu, solange die Beute über Goldkelchen zurück an ihre Lager geht.",
    intelValue: 64,
    disposition: "misstrauisch",
  },
  {
    id: "npc-leader-stadtwachen",
    mapRoles: ["leader", "operator"],
    districtId: "palast",
    factionId: "stadtwachen",
    locationId: "hofwache",
    name: "Hauptmann Brann Eisenwall",
    title: "Stadtkommandant",
    role: "Anführer der Stadtwachen",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description:
      "Brann befehligt die lokale Exekutive unter imperialer Aufsicht. Willkür trägt bei ihm oft ein Siegel.",
    appearance:
      "Breitschultrig, grauer Bart, Harnisch mit Löwenemblem, Knöchel von alten Paraden vernarbt.",
    personality_traits: "Kurz angebunden, ehrgeizig, glaubt Ordnung sei Härte.",
    gm_notes: "Unterstellt den Häusern des Nordens; Teile der Truppe sind vom Roten Auge unterwandert.",
    true_nature: "Karrierist, der Blindheit für Beförderung tauscht.",
    hidden_agenda: "Imperialen Vorgesetzten Ruhe melden, lokale Bestechung dulden.",
    secret_entry: "Patrouillenpläne für die Unterstadt werden „aus Versehen“ verspätet.",
    hooks: [
      {
        name: "Wachtmeisterin Halda",
        role: "Adjutantin",
        description: "Loyaler als Brann — und ahnt seine Deals.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Intimidation",
        dc: 14,
        result: "Er droht mit Haft, aber lässt Raum für „Gebühren“.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 15,
        result: "Seine Blicke weichen, wenn vom Roten Auge die Rede ist.",
        is_critical: false,
      },
    ],
    influence: 74,
    loyalty: 55,
    agenda: "Macht sichern, Unterwanderung leugnen, Hof ruhig halten.",
    darkSecret:
      "Er nimmt Silber vom Roten Auge, damit die Patrouillen in den Roten Gassen „zu spät“ kommen.",
    intelValue: 52,
    disposition: "bestechlich",
  },
  {
    id: "npc-leader-bund-silberne-rose",
    mapRoles: ["leader", "operator"],
    districtId: "tempelbezirk",
    factionId: "bund-silberne-rose",
    locationId: "rose-hof",
    name: "Priorin Elowen Silberblatt",
    title: "Hüterin der offenen Höfe",
    role: "Anführerin des Bundes der Silbernen Rose",
    race: "Elfin",
    alignment: "Neutral Good",
    description:
      "Elowen predigt im Hof der Silbernen Rose gegen gezähltes Schicksal und bietet Unterschlupf ohne Garde-Ohren.",
    appearance:
      "Weiße Rosen im Haar, schlichte Robe, warme Augen, eine silberne Brosche in Form einer Rose.",
    personality_traits: "Hoffnungsvoll, standhaft, weigert sich, Namen an die Garde zu geben.",
    gm_notes: "Rivalin des Konklaves; leichte Allianz zu Goldkelchen.",
    true_nature: "Elysia-Gläubige, die Ordnung als Käfig sieht.",
    hidden_agenda: "Konklave-Liturgie öffentlich entlarven und Hofkapelle stärken.",
    secret_entry: "Im Kreuzgang lagern Flüchtlingslisten, die nie die Wache erreichen.",
    hooks: [
      {
        name: "Bruder Calen",
        role: "Heilkundiger",
        description: "Versorgt Verletzte ohne Fragen nach Kulten.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Religion",
        dc: 12,
        result: "Ihre Worte gegen Chromus sind klar und gefährlich.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 14,
        result: "Sie verheimlicht, wie viele sie bereits versteckt.",
        is_critical: false,
      },
    ],
    influence: 61,
    loyalty: 92,
    agenda: "Elysia-Hoffnung gegen Chromus-Zwang stellen.",
    darkSecret:
      "Sie hat einmal einem Malanthir-Flüchtling Asyl gegeben — und schweigt, weil die Stadt ihn sonst henkte.",
    intelValue: 55,
    disposition: "wohlwollend",
  },
  {
    id: "npc-leader-konklave-ewige-ordnung",
    mapRoles: ["leader", "operator"],
    districtId: "tempelbezirk",
    factionId: "konklave-ewige-ordnung",
    locationId: "konklave-saal",
    name: "Numerus Kael Chronosiegel",
    title: "Erster Liturg",
    role: "Anführer des Konklaves der Ewigen Ordnung",
    race: "Mensch",
    alignment: "Lawful Evil",
    description:
      "Kael leitet die Chromus-Liturgie im Saal der Ewigen Ordnung: Kerzen, Zahlen, Zwang auf den Palast.",
    appearance:
      "Kahle Schädelhaut mit goldenen Zahlentätowierungen, schwere Kettenrobe, metronomische Gesten.",
    personality_traits: "Kalt, präzise, hält Mitgefühl für Rechenfehler.",
    gm_notes: "Rivalität zur Silbernen Rose; Allianz zu Teilen der Stadtwache.",
    true_nature: "Fanatiker der gezählten Ordnung.",
    hidden_agenda: "Hof und Garde an Liturgiezeiten binden und die Rose isolieren.",
    secret_entry: "Nachtliturgien stehen in keinem öffentlichen Kalender.",
    hooks: [
      {
        name: "Novizin Thessa",
        role: "Chronistin",
        description: "Schreibt Schicksalszahlen — und zweifelt heimlich.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Religion",
        dc: 15,
        result: "Seine Zitate aus Chromus-Texten sind drohend korrekt.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 16,
        result: "Er plant den nächsten öffentlichen Disput mit der Rose.",
        is_critical: false,
      },
    ],
    influence: 68,
    loyalty: 95,
    agenda: "Chromus-Ordnung über Tempel und Palast legen.",
    darkSecret:
      "Er hat einen Rivalen im Konklave „gezählt“ — die Leiche liegt unter dem Chorraum vermauert.",
    intelValue: 48,
    disposition: "feindselig",
  },
  {
    id: "npc-leader-zunftbund",
    mapRoles: ["leader", "operator"],
    districtId: "handwerkerviertel",
    factionId: "zunftbund",
    locationId: "zunft",
    name: "Meisterin Greta Hammerklang",
    title: "Zunftvögtin",
    role: "Anführerin des Zunftbunds Aurenfurt",
    race: "Zwergin",
    alignment: "Lawful Neutral",
    description:
      "Greta führt das Zunfthaus: Verträge wiegen mehr als Wappen, Essen und Kontore halten zusammen.",
    appearance:
      "Rußige Schürze über guter Wolle, Hammeramulett, kurze graue Zöpfe, feste Handschläge.",
    personality_traits: "Direkt, fair unter Zünftigen, misstrauisch gegen Adel und Seide.",
    gm_notes: "Spannung zu Haus der Seide und Stadtwachen; Rivalität zu Nordhäusern.",
    true_nature: "Pragmatikerin, die Unabhängigkeit der Handwerker verteidigt.",
    hidden_agenda: "Seidenhaus-Gebühren brechen und Hofprivilegien abwehren.",
    secret_entry: "Im Zunftkeller lagern Verträge, die den Adel bloßstellen könnten.",
    hooks: [
      {
        name: "Joran Esse",
        role: "Schmiedegeselle",
        description: "Kennt jede Lieferung Erz vor der Garde.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Persuasion",
        dc: 13,
        result: "Sie handelt hart, aber hält Wort, wenn gesiegelt ist.",
        is_critical: false,
      },
      {
        type: "Investigation",
        dc: 14,
        result: "Zunftsiegel auf Dokumenten entlarven gefälschte Seidenhaus-Quittungen.",
        is_critical: false,
      },
    ],
    influence: 66,
    loyalty: 84,
    agenda: "Zunftautonomie und faire Preise gegen Seidennetz.",
    darkSecret:
      "Sie deckt einen Schmuggel von Zunftstahl an das Rote Auge — gegen Schutz der Essen vor Brandstiftung.",
    intelValue: 57,
    disposition: "neutral",
  },
  {
    id: "npc-leader-zirkel-observatorium",
    mapRoles: ["leader", "operator"],
    districtId: "akademieviertel",
    factionId: "zirkel-observatorium",
    locationId: "observatorium",
    name: "Magisterin Lyra Sternenwacht",
    title: "Hüterin der Sternenkammer",
    role: "Anführerin des Zirkels des Observatoriums",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description:
      "Lyra leitet das magische Observatorium: weiße Magie, Lehrstühle und eine Kuppel, die nachts mehr sieht als der Hof zugibt.",
    appearance:
      "Silbernes Haar im Stirnreif, sternbestickte Robe, kühle Augen, Finger voller Kreide und Messingringe.",
    personality_traits: "Präzise, geduldig mit Schülern, scharf gegen Konfessionsdruck in den Sälen.",
    gm_notes: "Spannung zu Rose und Konklave; Allianz zur Schwertschule der Stadtwachen.",
    true_nature: "Bewahrerin legaler Magie — und stiller Schiedsrichter zwischen den Kulten.",
    hidden_agenda: "Den Zirkel unabhängig halten und verbotene Abschriften nur unter Siegel halten.",
    secret_entry: "In der Sternenkammer liegen Messungen, die Malanthir-Spuren am Nachthimmel zeigen.",
    hooks: [
      {
        name: "Novize Corin",
        role: "Sternenschüler",
        description: "Führt nächtliche Messungen — und schweigt über fehlende Seiten im Logbuch.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Arcana",
        dc: 15,
        result: "Ihre Formeln sind Vattrak-rein — bis auf eine korrigierte Zeile am Rand.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 16,
        result: "Sie weicht aus, wenn nach dem versiegelten Archivschrank gefragt wird.",
        is_critical: false,
      },
    ],
    influence: 74,
    loyalty: 86,
    agenda: "Akademieautonomie und weiße Magie gegen Kultzwang schützen.",
    darkSecret:
      "Sie bewahrt eine verbotene Malanthir-Abschrift in der Sternenkammer — „zum Studium“, sagt sie, und niemandem sonst.",
    intelValue: 72,
    disposition: "misstrauisch",
  },
] as const;

/** Betreiber nur für Orte ohne Anführer-HQ-Überlappung. */

