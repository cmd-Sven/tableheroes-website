export type CampaignFatePointsRules = {
  fate_points_intro: string;
  fate_points_w10_rules: string;
  fate_points_gm_notes: string;
};

export const DEFAULT_FATE_POINTS_INTRO = `## Schicksalspunkte — Vattrak & Malanthirk

In dieser Kampagne nutzen wir **Schicksalspunkte** als dramatisches Werkzeug zwischen Spielern und Spielleiter.

- **Vattrak (weiß):** Die Spieler können einen weißen Punkt einsetzen, um einen Vorteil zu erzielen oder eine besondere Szene zu beeinflussen.
- **Malanthirk (schwarz):** Sobald ein Spieler einen weißen Punkt nutzt, wird er **umgedreht** — die Rückseite ist schwarz. Diese schwarzen Punkte stehen dem **Spielleiter** zur Verfügung, um Gegenwind, Komplikationen oder dramatische Wendungen einzuführen.

Der Spielleiter legt fest, **wann** das Verhältnis von weiß zu schwarz neu gewürfelt wird (z. B. nach einer langen Rast, zu Beginn eines Aktes oder nach einem wichtigen Plot-Punkt).`;

export const DEFAULT_FATE_POINTS_W10_RULES = `## W10-Umverteilung (Pool)

Wenn der Zeitpunkt für die Umverteilung erreicht ist, würfelt der Spielleiter (oder ein Spieler nach SL-Vorgabe) einen **W10**:

| Wurf | Ergebnis |
|------|----------|
| **Gerade** (2, 4, 6, 8) | Punkt wird **weiß** (Vattrak) |
| **Ungerade** (3, 5, 7, 9) | Punkt wird **schwarz** (Malanthirk) |
| **1** | **Zwei schwarze** Punkte (Malanthirk) |
| **10** | **Zwei weiße** Punkte (Vattrak) |

Punkte können auch **aus dem gesamten Pool entfernt** werden — das sind seltene, besondere Aktionen (z. B. Opfer, mächtige Artefakte, narrative Preise). Der Spielleiter entscheidet, wann das zulässig ist.

In der **Live-Session** verwaltet ihr den aktuellen Pool über die Schicksalsmünzen im Session-Board.`;

export const DEFAULT_FATE_POINTS_GM_NOTES = `## Zusatzregeln (Spielleiter)

Ergänze hier kampagnenspezifische Regeln: Was passiert, wenn ein Spieler einen weißen Punkt ausgibt? Wann darf der SL schwarze Punkte einsetzen? Gibt es Limits pro Szene?

*(Noch keine Zusatzregeln hinterlegt — als SL kannst du diesen Text bearbeiten.)*`;

export function defaultFatePointsRules(): CampaignFatePointsRules {
  return {
    fate_points_intro: DEFAULT_FATE_POINTS_INTRO,
    fate_points_w10_rules: DEFAULT_FATE_POINTS_W10_RULES,
    fate_points_gm_notes: DEFAULT_FATE_POINTS_GM_NOTES,
  };
}
