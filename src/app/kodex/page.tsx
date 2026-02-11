import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Goldener Ornament-Divider zwischen den Sektionen                   */
/* ------------------------------------------------------------------ */
function GoldDivider() {
  return (
    <div className="flex items-center justify-center gap-4 my-8 md:my-10">
      <span className="block h-px flex-1 max-w-[80px] bg-linear-to-r from-transparent to-[#cab926]/50" />
      <span className="text-[#cab926]/70 text-lg select-none">&#x2726;</span>
      <span className="block h-px flex-1 max-w-[80px] bg-linear-to-l from-transparent to-[#cab926]/50" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kodex-Sektionen (I – VI)                                           */
/* ------------------------------------------------------------------ */
const KODEX_SECTIONS = [
  {
    numeral: "I",
    title: "Grundwerte der Gemeinschaft",
    paragraphs: [
      "Wir begegnen einander mit Respekt, Ehrlichkeit und Wertschätzung – unabhängig von Alter, Geschlecht, Herkunft, Religion oder Erfahrung. Beleidigungen, Diskriminierung, Rassismus, Sexismus, Homophobie und jede Form von Hassrede führen zum sofortigen Ausschluss.",
      "Ob Neuling oder Veteran: Bei den Table-Heroes ist jeder willkommen. Wir helfen einander, das Hobby zu entdecken und gemeinsam daran zu wachsen. Konflikte zwischen Charakteren gehören zur Geschichte. Konflikte zwischen Spielern gehören gelöst – offen, fair und respektvoll.",
    ],
  },
  {
    numeral: "II",
    title: "Das Online-Reich",
    paragraphs: [
      "In unseren digitalen Kanälen (Discord, Plattform, Chat) gelten dieselben Umgangsregeln wie am physischen Spieltisch. Persönliche Daten anderer Mitglieder werden nicht ohne deren Einwilligung weitergegeben. Screenshots und Aufnahmen aus privaten Runden sind nur mit Zustimmung aller Beteiligten erlaubt.",
      "Wir pflegen einen konstruktiven Ton. Meinungsverschiedenheiten werden sachlich ausgetragen – ohne persönliche Angriffe, Trolling oder Spam.",
    ],
  },
  {
    numeral: "III",
    title: "Am physischen Tisch",
    paragraphs: [
      "Wer einen Spielraum nutzt, hinterlässt ihn so, wie er ihn vorgefunden hat – oder besser. Essen und Getränke werden achtsam behandelt; Spielmaterial (Bücher, Miniaturen, Karten) wird pfleglich genutzt und zeitnah zurückgegeben.",
      "Der Gastgeber hat das Hausrecht. Rauchen, Alkohol und Lautstärke richten sich nach den Regeln des jeweiligen Veranstaltungsortes.",
    ],
  },
  {
    numeral: "IV",
    title: "Zuverlässigkeit & Verbindlichkeit",
    paragraphs: [
      "Wenn du dich zu einer Runde anmeldest, erscheine pünktlich. Solltest du verhindert sein, sage so früh wie möglich ab – deine Mitspieler planen ihren Abend um dich herum. Wiederholtes unentschuldigtes Fehlen kann zum Ausschluss aus der Kampagne führen.",
      "Fairplay ist selbstverständlich: Würfelergebnisse werden akzeptiert und Regeln respektiert. Scheitern gehört zur besten Geschichte.",
    ],
  },
  {
    numeral: "V",
    title: "Das Recht des Spielleiters",
    paragraphs: [
      "Probleme, Wünsche oder Unbehagen werden offen mit dem Spielleiter besprochen. Jeder GM ist angehalten, ein sicheres Spielumfeld zu schaffen, in dem sich alle wohlfühlen.",
    ],
    quote:
      "Das Wort des Meisters ist Gesetz. Der Spielleiter hat in Regelfragen das letzte Wort – Diskussionen dazu finden nach der Session statt, nicht währenddessen.",
  },
  {
    numeral: "VI",
    title: "Technik & Vorbereitung",
    paragraphs: [
      "Für Online-Runden sorgst du für ein funktionierendes Mikrofon, eine stabile Internetverbindung und einen ruhigen Raum. Kamera ist erwünscht, aber kein Muss. Halte dein Charakterblatt aktuell und sei mit den Grundregeln deines Systems vertraut, damit das Spiel für alle flüssig läuft.",
    ],
  },
];

/* ================================================================== */
/*  Rahmen-Konstanten                                                  */
/* ================================================================== */
const BORDER_H = "border_top-bottom_gold.png"; // horizontal (repeat-x)
const BORDER_V = "border_left-right_gold.png"; // vertikal   (repeat-y)
const CORNER = "corner-dragon-only.png"; // Ecke (oben-links Ausrichtung)

const BORDER_H_HEIGHT = 28; // px – Höhe der Runen-Leiste
const BORDER_V_WIDTH = 30; // px – Breite der Seiten-Ornamente
const CORNER_SIZE = 80; // px – Eckgrafiken

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */
export default function KodexPage() {
  return (
    <div className="min-h-screen bg-background-dark">
      {/* ── Back-Button ─────────────────────────────────────────── */}
      <div className="container mx-auto max-w-5xl px-4 pt-6 md:pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-sm text-gray-400 hover:text-hero-vibrant transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>

      {/* ── Gerahmter Pergament-Container ───────────────────────── */}
      <div className="container mx-auto max-w-5xl px-2 sm:px-4 py-8 md:py-12">
        <div className="relative">
          {/* ============================================================
              BORDER TOP – horizontal wiederholend
              ============================================================ */}
          <div
            className="relative w-full"
            style={{
              height: BORDER_H_HEIGHT,
              backgroundImage: `url('/images/${BORDER_H}')`,
              backgroundRepeat: "repeat-x",
              backgroundSize: `auto ${BORDER_H_HEIGHT}px`,
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />

          {/* ============================================================
              MIDDLE ROW: links | Pergament | rechts
              ============================================================ */}
          <div className="flex">
            {/* Linke Bordüre – vertikal wiederholend (Desktop) */}
            <div
              className="hidden md:block shrink-0"
              style={{
                width: BORDER_V_WIDTH,
                backgroundImage: `url('/images/${BORDER_V}')`,
                backgroundRepeat: "repeat-y",
                backgroundSize: `${BORDER_V_WIDTH}px auto`,
                backgroundPosition: "center",
              }}
              aria-hidden="true"
            />

            {/* ── Pergament-Fläche ─────────────────────────────── */}
            <div
              className="flex-1 px-6 py-10 md:px-14 md:py-14"
              style={{
                background:
                  "linear-gradient(170deg, #f5e6c8 0%, #ecdbb2 25%, #e8d4a4 50%, #ecdbb2 75%, #f0dfb5 100%)",
                boxShadow: "inset 0 0 60px rgba(139, 119, 72, 0.15)",
              }}
            >
              {/* Header */}
              <header className="text-center mb-8 md:mb-12">
                <h1 className="font-cinzel font-bold text-3xl md:text-5xl text-[#58180D] leading-tight mb-3">
                  Der Table-Heroes Kodex
                </h1>
                <p className="font-cinzel text-sm md:text-base text-[#8b6914] tracking-wide">
                  Ehre, Respekt und die Gemeinschaft des Würfels
                </p>
                <GoldDivider />
                <p className="font-libre text-sm md:text-base text-[#4a3c28] leading-relaxed max-w-2xl mx-auto">
                  Diese Regeln bilden das Fundament unserer Gemeinschaft. Wer
                  Teil der Table-Heroes wird, verpflichtet sich, diese Werte zu
                  leben – am Spieltisch und darüber hinaus.
                </p>
              </header>

              {/* Sektionen I – VI */}
              <div className="space-y-2">
                {KODEX_SECTIONS.map((section, idx) => (
                  <section key={section.numeral}>
                    <h2 className="font-cinzel font-bold text-xl md:text-2xl text-[#58180D] mb-3">
                      <span className="text-[#8b6914] mr-2">
                        {section.numeral}.
                      </span>
                      {section.title}
                    </h2>

                    {section.paragraphs.map((p, pIdx) => (
                      <p
                        key={pIdx}
                        className="font-libre text-sm md:text-base text-[#3b3020] leading-relaxed mb-3"
                      >
                        {p}
                      </p>
                    ))}

                    {section.quote && (
                      <blockquote
                        className="relative my-5 mx-2 md:mx-8 rounded border-l-4 border-[#8b6914] px-5 py-4"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(202,185,38,0.08), rgba(139,105,20,0.12))",
                        }}
                      >
                        <p className="font-libre text-sm md:text-base italic text-[#58180D] leading-relaxed">
                          &bdquo;{section.quote}&ldquo;
                        </p>
                      </blockquote>
                    )}

                    {idx < KODEX_SECTIONS.length - 1 && <GoldDivider />}
                  </section>
                ))}
              </div>

              {/* Footer / Siegel */}
              <div className="mt-10 md:mt-14">
                <GoldDivider />
                <div className="text-center">
                  <p className="font-cinzel text-xs md:text-sm text-[#8b6914] uppercase tracking-[0.2em]">
                    Erstellt und gehütet von der Table-Heroes-Gemeinschaft
                  </p>
                  <p className="font-cinzel text-[10px] md:text-xs text-[#8b6914]/60 mt-2">
                    Osnabrück &middot; MMXXVI
                  </p>
                </div>
              </div>
            </div>

            {/* Rechte Bordüre – vertikal wiederholend (Desktop) */}
            <div
              className="hidden md:block shrink-0"
              style={{
                width: BORDER_V_WIDTH,
                backgroundImage: `url('/images/${BORDER_V}')`,
                backgroundRepeat: "repeat-y",
                backgroundSize: `${BORDER_V_WIDTH}px auto`,
                backgroundPosition: "center",
              }}
              aria-hidden="true"
            />
          </div>

          {/* ============================================================
              BORDER BOTTOM – horizontal wiederholend, gespiegelt
              ============================================================ */}
          <div
            className="relative w-full rotate-180"
            style={{
              height: BORDER_H_HEIGHT,
              backgroundImage: `url('/images/${BORDER_H}')`,
              backgroundRepeat: "repeat-x",
              backgroundSize: `auto ${BORDER_H_HEIGHT}px`,
              backgroundPosition: "center",
            }}
            aria-hidden="true"
          />

          {/* ============================================================
              4 CORNER-GRAFIKEN – absolut über dem Rahmen positioniert
              ============================================================ */}
          {/* Oben-Links (Original-Ausrichtung) */}
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              top: -(CORNER_SIZE * 0.15),
              left: -(CORNER_SIZE * 0.15),
              width: CORNER_SIZE,
              height: CORNER_SIZE,
            }}
          >
            <Image
              src={`/images/${CORNER}`}
              alt=""
              width={CORNER_SIZE}
              height={CORNER_SIZE}
              className="w-full h-full object-contain"
              aria-hidden="true"
            />
          </div>

          {/* Oben-Rechts (horizontal gespiegelt) */}
          <div
            className="absolute z-10 pointer-events-none -scale-x-100"
            style={{
              top: -(CORNER_SIZE * 0.15),
              right: -(CORNER_SIZE * 0.15),
              width: CORNER_SIZE,
              height: CORNER_SIZE,
            }}
          >
            <Image
              src={`/images/${CORNER}`}
              alt=""
              width={CORNER_SIZE}
              height={CORNER_SIZE}
              className="w-full h-full object-contain"
              aria-hidden="true"
            />
          </div>

          {/* Unten-Links (vertikal gespiegelt) */}
          <div
            className="absolute z-10 pointer-events-none -scale-y-100"
            style={{
              bottom: -(CORNER_SIZE * 0.15),
              left: -(CORNER_SIZE * 0.15),
              width: CORNER_SIZE,
              height: CORNER_SIZE,
            }}
          >
            <Image
              src={`/images/${CORNER}`}
              alt=""
              width={CORNER_SIZE}
              height={CORNER_SIZE}
              className="w-full h-full object-contain"
              aria-hidden="true"
            />
          </div>

          {/* Unten-Rechts (beidseitig gespiegelt) */}
          <div
            className="absolute z-10 pointer-events-none"
            style={{
              bottom: -(CORNER_SIZE * 0.15),
              right: -(CORNER_SIZE * 0.15),
              width: CORNER_SIZE,
              height: CORNER_SIZE,
              transform: "scale(-1, -1)",
            }}
          >
            <Image
              src={`/images/${CORNER}`}
              alt=""
              width={CORNER_SIZE}
              height={CORNER_SIZE}
              className="w-full h-full object-contain"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
