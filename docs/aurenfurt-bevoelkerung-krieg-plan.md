# Aurenfurt: Bevölkerung, Krieg, Märkte, Finanzen, Vattrak-Lager

Kurzplan für die Umsetzung. Gold und Marktpreise sind weitgehend **Derived Stats**.
Bevölkerung, Front und Vattrak-Lager speisen die Anzeige und (bei Knappheit) dosiert die Meter.

## Coding-Regeln

- Keine UI-/Logik-Datei über **600 Zeilen** — früh auslagern (Hook, Panel, Series-Builder, Types).
- Jede neue Datei beginnt mit einem kurzen Blockkommentar: **Was** sie ist, **wie** man sie einsetzt.
- Finanzen ändern **niemals** Kernmeter, Spannung oder Tagesdeltas.

## Timeline (fixiert)

| Phase | Datum | Inhalt |
|-------|-------|--------|
| A Start | 2023-09-26 | Bevölkerung 32.122; Marktindex 100; Vattrak-Lager Startbestand |
| B Leichte Mobilisierung | Start → 2024-05-01 | Kleine Rekrutierung in der Stadt; **noch keine Kriegsflüchtlinge** |
| C Mobilmachung | **2024-05-02** | Hilferuf Greifenberg; 60–70 % Stadtgarde → Front; Wirtschaft/Vattrak-Druck |
| D Peak | **2025-08-04** | Invasion Greifenberg; weiterer Abzug + Preisschock + Flüchtlinge + Frontverluste |
| E Nachphase | danach | Druck flacht; sporadische Gefechte; Rückkehr 10–15 % der Abgezogenen, davon 20–30 % dienstfähig |

Hintergrund (nur Lore/Tooltip): Xarvathar ab ~2020/21 ressourcenleer; Sommer 2021 Grenzübergriffe; **21.08.2023** Kriegserklärung (Diplomat).

## Module / Dateien (Zielstruktur)

| Datei | Rolle |
|-------|--------|
| `aurenfurt-population-types.ts` | Schichten, Front, Snapshot-Typen |
| `aurenfurt-population-seed.ts` | Startverteilung 32.122 + Schicht-Splits |
| `aurenfurt-population.ts` | Tägliche Serie: Deltas, Events C/D, Cache |
| `aurenfurt-war-events.ts` | History-Impacts Mobilmachung / Peak (Meter mitziehen) |
| `aurenfurt-market-types.ts` | Preis-Körbe (Lebensmittel, Rohstoffe, Luxus, Waffen, Vattrak, Malanthir) |
| `aurenfurt-market.ts` | Index Stadt + je Viertel aus Meter + Kriegsphase |
| `aurenfurt-vattrak-stock.ts` | **Lager**: Zufluss, Nachfrage, Rationierung, Schwellen |
| `aurenfurt-finances.ts` | Read-only GP: Income / Expenses / Net |
| Dashboard: `PopulationChartPanel.tsx`, `ForcesPanel.tsx`, `MarketChartPanel.tsx`, `FinancePanel.tsx` | UI &lt; 600 Zeilen je Datei |

Bestehende History (`aurenfurt-history.ts`) erhält die Kriegs-Events oder importiert sie aus `aurenfurt-war-events.ts`, damit Meter und Bevölkerung synchron laufen.

## Bevölkerung

- Schichten: `pop_nobles`, `pop_citizens`, `pop_guards`, `pop_lowerclass`; Summe = `population_total`
- Stadtweit: `soldiers_at_front`
- Speicherung: **memoized on-the-fly**, kein Supabase-Tages-Backfill

## Vattrak-Lager (knapp, rationiert)

Eigenes leichtes Lagerbuch — **kein** Gold-Feedback, aber **dosierte** Meter-Effekte bei Knappheit.

```
stock_t = clamp(stock_{t-1} + supply_t − demand_t, 0, stockCap)
```

- **Zufluss (`supply`)**: Basis aus Berg-/Nordlinie (an `mountainSupply`-Idee angelehnt), gedrosselt durch Winter/Events und Kriegsphase (C/D starker Abfluss Richtung Front).
- **Nachfrage (`demand`)**, Priorität Rationierung:
  1. Front (Kampfmagie / Paladine / Kleriker)
  2. Tempel (Elysia & Chromus — Segen/Heilung)
  3. Handwerk (magische Rüstungen)
  4. Adel / Luxus
- **Schwellen** (stock / Tagesbedarf):
  - &gt; 60 %: ruhig
  - 30–60 %: rationiert (Adel/Handwerk zuerst gekürzt)
  - &lt; 30 %: kritisch → `vattrak`↓, Vattrak-Marktpreis↑, `malanthir`↑ + `crime`↑ (Substitution „kein Vattrak → Malanthir“)
- Dashboard: Lagerstand, Zufluss, Rationierungsstufe; koppelt an Marktindex „Vattrak-Erz“.

Malanthir bleibt illegal; Preis/Volatilität über Schwarzmarkt-Index + Meter `malanthir`.

## Märkte

Index 100 am 26.09.2023; **stadtweit und je Viertel**.  
Körbe: Lebensmittel, Rohstoffe, Luxus, Waffen/Rüstung, Vattrak (legal), Malanthir (Schwarzmarkt).

## Finanzen (Derived, Read-only)

```
Income   = (citizens * 0.1 + nobles * 0.5) * (economy / 100)
Expenses = guards * 1.0 + lowerclass * 0.02
Net      = Income − Expenses
```

Stadt = Summe der Viertel. Widget „Tägliche Stadtkasse“; später optional Umsatz-Chart.

## Implementierungsreihenfolge

1. Types + Seed-Bevölkerung — **erledigt**  
2. Population-Serie + Kriegs-Events (Meter mitziehen) + Front — **erledigt**  
3. Vattrak-Lager + Knappheits-Effekte auf Meter/Markt — **erledigt**  
4. Marktindizes Stadt + Viertel — **erledigt**  
5. Dashboard-Panels (Bevölkerung, Kräfte, Markt) — **erledigt** (`CitySocietyPanels.tsx`)  
6. Finanzen Utility + Widget — **erledigt**  

## Nicht in v1

- Kumulierte Stadtkasse über Jahre speichern  
- Frontsoldaten in den täglichen Guard-Sold einrechnen (optional später „Kriegsversorgung“)  
- Volles Erz-Inventar pro Gebäude  
- Separater Umsatz-Verlaufs-Chart (Finanzen am Stichtag sind da; Serie folgt leicht)
