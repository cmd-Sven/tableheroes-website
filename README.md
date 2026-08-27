# Table Heroes

**Table Heroes** ist eine webbasierte Plattform für Pen-&-Paper-/TTRPG-Kampagnen: Community, Weltbau, Kampagnen-Management und Live-Sessions — mit dem Ziel, eine **moderne Virtual-Tabletop-(VTT)-Alternative** zu Tools wie Roll20 und Foundry VTT zu werden.

Live: [table-heroes.de](https://table-heroes.de) · Repo: [cmd-Sven/tableheroes-website](https://github.com/cmd-Sven/tableheroes-website)

---

## Neuestes Update (August 2026) — Sync-Feinschliff, Sheet-Overrides & Live-Performance

Weiterer Ausbau des **Live-Session-Tisches**: zuverlässigere Token-/Zeichen-Sync, Webcams, Exhaustion und Charakterbogen-Overrides — plus Cleanup und Performance-Fixes für Sessions mit mehreren Spielern.

### Live-Session & Battlemap
- **Token-Bewegung**: Persistenz und Just-in-Time-Sync (Broadcast + Realtime); Spieler- und SL-Tokens zuverlässig bewegbar
- **Freihändige Map-Zeichnungen** (`session_map_draw_strokes`): inkrementelle Realtime-Patches statt Full-Reload
- **Webcam WebRTC**: Avatar- und SL-Kameras Peer-to-Peer; Presence-Stabilität gegen Reconnect-Stürme
- Fog of War, Effekt-Schablonen, Spezialeffekte-Marker, Trap-System (Wizard manuell/KI)
- Combat: Initiative-HUD, Active-Turn-Highlight, Kampfstart-Video

### Charakterbogen (DnD5e)
- **Spell Catalog** / Zauberwahl am Sheet
- **Exhaustion (2024)** am Sheet, Radialmenü und Party-Tray-Badge
- **Sheet Overrides**: manuelle Overrides für AC, Initiative und Bewegung
- Rest / Erschöpfung-Integration

### Stabilität
- Dead-Code-Cleanup (verwaiste Session-Toolbars/Modals)
- Live-Board-Hooks strukturiert (u. a. Draw-Sync extrahiert); Token-Layer-Memo wirksam

> Production-Build (`npm run build`) vor dem Deploy empfohlen.

---

## Produkt (Was ist Table Heroes?)

Heute verbindet Table Heroes drei Dinge:

1. **Community & Marketing** — Landingpage, News, Community-Events, öffentliche Lore (Osnabrück / Kassadras u. a.)
2. **Kampagnen- & Weltbau-Tool** — Welten, NPCs, Fraktionen, Lore, Orte, Bestarium, Quests, Shops, Charakterbögen (u. a. DnD5e)
3. **Live-Session / Session Board** — gemeinsame Session-Oberfläche mit Kampf, Würfeln, Battlemap, Chronist (Audio→Text), Loot, Handheben u. v. m.

**Vision:** den Live-Tisch so ausbauen, dass Table Heroes als **VTT-Alternative zu Roll20 und Foundry** nutzbar ist — parallel bleibt die Integration mit Foundry über das Bridge-Modul und die Sync-API erhalten.

> **Hinweis:** Was unter „Bereits umgesetzt“ und im Block **Neuestes Update** steht, basiert auf dem aktuellen Code. Ein kompletter Foundry-/Roll20-Ersatz bleibt **Roadmap**.

---

## Tech-Stack

| Bereich | Technik |
|--------|---------|
| Framework | **Next.js** (App Router), **React**, **TypeScript** |
| Styling / UI | **Tailwind CSS**, Lucide Icons, Framer Motion, Sonner |
| Backend / Auth / DB | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`), Postgres-Migrationen unter `supabase/migrations/` |
| Realtime | Supabase Realtime (`postgres_changes` + Session-**Broadcast**-Snapshots) + **WebRTC** (Webcam-Signaling) |
| Editor | **TipTap** (Rich Text / Markdown) |
| 3D-Würfel | **Three.js** + **React Three Fiber** / Drei |
| Battlemap | Stage + **react-zoom-pan-pinch**, Overlay-Navigation (Pan/Zoom %) |
| Markdown | **react-markdown** (u. a. KI-/News-Text) |
| KI | **OpenAI** (u. a. Lore/NPC-Hilfe, Bildmodelle, Session-Chronik, Trap-Wizard) |
| E-Mail | **Resend** (Cron: tägliche Notification-Mails via Vercel) |
| Deploy | **Vercel** (`vercel.json` mit Cron) |
| Optional | **Foundry VTT**-Modul `foundry-module/tableheroes-bridge` + REST unter `/api/v1/foundry-sync` |

Weitere Scripts: DnD5e-Katalog-Build (`catalog:dnd5e*`), Selftests für Progression und Würfel-Faces.

---

## Bereits umgesetzte Features (aus dem Code)

### Öffentlich / Community
- Marketing-Landingpage (Hero, Features, Termine, FAQ, Gamification, Systeme, News)
- News & freigegebene Lore auf der Startseite
- Community-Events / Spielplanung
- Öffentliche Kampagnen-Seiten, Datenschutz, Impressum
- Support-Bereich, Kodex, Profile (`/profile/[username]`)
- Auth: Login / Signup (Supabase), Onboarding, Maintenance-Modus

### Dashboard & Kampagnen
- Dashboard-Übersicht, eigene Kampagnen, Sessions-Übersicht
- Kampagnen anlegen und verwalten (Tabs u. a.: Übersicht, Sessions, NPCs, Fraktionen, Welt & Lore, Quests, Teilnehmer)
- Bewerbungen / Mitgliederverwaltung, Player-Dashboard
- Session-Planung / Schedule, Session-Typen, RSVP / Teilnahme
- Kampagnen-Umfragen (Polls)
- Regelsystem / Presets pro Kampagne
- Discord-Webhooks, E-Mail-Benachrichtigungen
- SEO / öffentliche Lore-Freigabe
- Nachrichten, Achievements, Punkte-Katalog (Gamification)
- Admin-Bereich (User, News, Events)
- GM-Inbox, Planungsevents, Punkte-Katalog (GM)

### Welten & Content
- **Welten**-Bereich inkl. Wizard / Erstellung
- **NPCs** inkl. Portrait, optionalem **Kampf-Token** (Crop/Rahmen), **Kampfwerten**/Sheet, KI-Hilfe, Reveal für Spieler
- **Fraktionen** (Banner, Wizard, Reveal)
- **Hierarchische Lore** (Parent/Child, Typen, Reveal)
- **Orte / Locations**
- **Bestarium** (Kreaturen / Beast Cards)
- **Quests**
- **Shops** / Inventar / Währung
- Szenen-Medien (Scene Media, ggf. Location-Link)

### Charaktere
- Charakterverwaltung und Detailseiten
- DnD5e-Charakterbogen / Sheet-Daten (Progression-Katalog, DE-Patches)
- **Spell Catalog** / Zauberwahl
- **Exhaustion (2024)** inkl. Live-Badges
- **Sheet Overrides** (AC, Initiative, Bewegung)
- Bedingungen / Mood-Zustände / Biography & Flaws
- Ausrüstung, Gold/XP, Token-Generierung (inkl. KI-Bild)
- Spieler-Edit-Alerts

### Live-Session (Session Board) — Kern des VTT-Pfads
- Live-Session-Seite `/session/[sessionId]` und Gast-Join `/session/join/[token]`
- **Linkes Dock** + **Top-Toolbar** (Ort, Fate Coins, SL-Werkzeuge); Würfel als eigenes Panel
- **Avatar-Leiste** als Overlay über der Bühne (Voll / Mini / Aus)
- **Webcam WebRTC** (Avatar-Cams + SL-Cam, Master-Mute im Party-Slot)
- **Battlemap** (Stand siehe [`BATTLEMAP.md`](./BATTLEMAP.md)):
  - Session-Maps, Grid, Charakter-/NSC-/Kreatur-Tokens, Props
  - Overlay-Navigation (Pfeile / Zoom % / Einpassen)
  - Bewegung inkl. Dash & Pause (animiert); Token-Einstellungen (HP-Balken, Größe, Sichtbarkeit)
  - Spieler-Token: gleiches Radialmenü wie Avatar (Gemüt, SL-Zustand, Waffen, …)
  - Zustands-Badge + Tooltip; Live-Bild nach Gemüt/Zustand; Exhaustion-Badge
  - **Just-in-Time-Sync** für Bewegung, Einstellungen und Zustände (Broadcast-Snapshots + Realtime)
  - **Fog of War** + **Effekt-Schablonen** + **Spezialeffekte-Marker** + **Trap-System**
  - **Freihändige Map-Zeichnungen** (SL zeichnet, Realtime an alle Clients)
- **Combat**: Initiative-HUD, Active-Turn nur Border-Glow, Video-Intro, Zugsteuerung
- **3D-Würfel** (R3F) inkl. Roll-Sound und Reveal erst nach Landung
- Handheben (Hand Raise)
- Szenen-Karten, Beast Cards, Loot (Draft / Side-Panel)
- Travel / Downtime (bestehende Grundzüge)
- Fate Coins, Tagesphase
- Session Wrap-up / Teilnahme-Belohnungen
- **Chronist**: Audio-Chunks, Transcription-APIs, Zusammenfassungen (OpenAI)

### Foundry-Integration (Bridge, kein Ersatz)
- Modul `foundry-module/tableheroes-bridge` (DnD5e): Punkte, Rang, Achievements, Wealth-/Portrait-Sync
- API: Profile, Sheet, Wealth, Portrait, Live-Session Sync

---

## Roadmap — Was als Nächstes auf den Tisch kommt

Die Roadmap hält den Kurs Richtung vollwertigem VTT und tieferer Kampagnen-Simulation. Ton: klar, immersiv, professionell.

### 1. Multiklassen-Feature (Charakterbogen)
Helden, die mehr als einen Pfad gehen: Multiklassen-Unterstützung am DnD5e-Bogen — Stufenverteilung, Features und Progression über mehrere Klassen hinweg, ohne den Bogen zu sprengen.

### 2. Städtesimulation
Die Instanz **„Stadt“** wird lebendig: Wirtschaft, Konflikte und Unruhen, Ruf, Religion, Bevölkerungsdichte, Kulturen und Ereignisse beeinflussen die Siedlung. Die Entwicklung passt sich an die Aktionen der Spieler an. Der Spielleiter sieht Statistiken und KPIs, erhält KI-Hinweise, Warnungen und Empfehlungen — die KI assistiert den SL, ersetzt ihn nicht.

### 3. Ping & Marker auf der Battlemap
Jeder Spieler kann Dinge markieren und anpingen, sodass **alle** es sehen. Cursor-Markierungen für die Gruppe — „Schaut hier!“ ohne den Chat zu fluten. Ergänzt die bestehenden SL-Spezialeffekt-Marker um Spieler-Pings.

### 4. Reise- und Rastfeature
Kurze und lange Rast sowie längere Reisen: Reisedauer, Biome / Flora / Fauna, Wetter, Ereignisse und Begegnungen, Rationen, Nachtwache beim Freicamping u. a. — Informationen für Spieler und SL, damit die Straße zwischen den Städten ebenso spannend wird wie der Dungeon.

### Weiter (VTT-Feinschliff)
- Fog/Effekte/Initiative weiter verfeinern
- Weitere Tisch-Features Richtung vollwertigem VTT

| Status | Themen |
|--------|--------|
| **Done / stark ausgebaut** | Session Board, Battlemap (Maps, Tokens, Bewegung, Overlay-Nav, Token-UI, JIT-Sync, Freehand-Draw), Fog / Effekte / Marker / Fallen, Combat-HUD, Würfel, Webcam WebRTC, Exhaustion, Spell Catalog, Sheet Overrides, Dock/Toolbar, Medien/Szenen, Chronist, Foundry-Bridge |
| **Geplant** | Multiklassen, Städtesimulation, Ping & Marker, Reise & Rast (siehe oben) |
| **Bewusst nicht** (aktuell laut `BATTLEMAP.md`) | Sync des SL-Viewports (Zoom/Pan bleibt lokal pro Client) |

Details zur Battlemap: [`BATTLEMAP.md`](./BATTLEMAP.md). Weitere Fach-Docs: `FACTIONS_SYSTEM_README.md`, `WORLD_LORE_SYSTEM.md`, `PLAYER_VIEW_UPDATE.md`, `PROJECT_STRUCTURE.md`.

**Roadmap auf GitHub:** Milestone [VTT-Alternative (Roll20 / Foundry)](https://github.com/cmd-Sven/tableheroes-website/milestone/1).

---

## Projektstruktur (Kurz)

```
tableheroes-website/
├── src/
│   ├── app/                 # Next.js App Router (Marketing, Auth, Dashboard, Session, API)
│   ├── components/          # UI (session/battlemap, worlds, characters, landing, …)
│   └── lib/                 # Supabase, Queries, DnD5e, Session, NPCs, Foundry-Sync, …
├── supabase/migrations/     # Schema-Evolution (inkl. Battlemap / Realtime)
├── foundry-module/          # Table Heroes Bridge für Foundry
├── scripts/                 # Katalog-Builds u. a.
├── public/                  # Statische Assets
├── BATTLEMAP.md             # Battlemap-Stand & Roadmap
├── vercel.json              # Cron-Jobs
└── package.json
```

---

## Setup & Start

### Voraussetzungen
- Node.js (aktuelles LTS empfohlen)
- npm
- Supabase-Projekt (URL + Keys)
- Optional: OpenAI-, Resend-, Cron-Secrets

### Installation

```bash
git clone https://github.com/cmd-Sven/tableheroes-website.git
cd tableheroes-website
npm install
```

### Umgebungsvariablen

Lege eine lokale `.env.local` an (nicht committen). Aus dem Code abgeleitet:

| Variable | Zweck |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/Admin (u. a. Foundry-API, Guest) |
| `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` | Canonical / Links (Default-Domain: table-heroes.de) |
| `OPENAI_API_KEY` | KI & Chronist |
| `OPENAI_IMAGE_MODEL` | optional, Default `gpt-image-1` |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-Mail |
| `CRON_SECRET` | Absicherung Cron-Route |
| `SESSION_GUEST_SECRET` | optional für Guest-Join |

### Entwickeln

```bash
npm run dev          # Next.js mit Turbopack
npm run build        # Production-Build
npm start            # Production-Server
npm run lint
```

Weitere Scripts: `catalog:dnd5e`, `test:progression`, `test:dice-faces` — siehe `package.json`.

Migrationen liegen unter `supabase/migrations/` (per Supabase CLI / SQL-Editor im Dashboard anwenden). Für Live-Sync der Battlemap u. a. `characters` in der Realtime-Publikation (siehe `20260810130412_battlemap_character_realtime_sync.sql`).

---

## Lizenz / Status

Privates Entwicklungsprojekt (`"private": true` in `package.json`), Version `0.1.0`. Fokus: Ausbau zum browserbasierten VTT bei gleichzeitig starkem Kampagnen- und Community-Tooling.
