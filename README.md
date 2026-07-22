# Table Heroes

**Table Heroes** ist eine webbasierte Plattform für Pen-&-Paper-/TTRPG-Kampagnen: Community, Weltbau, Kampagnen-Management und Live-Sessions — mit dem Ziel, eine **moderne Virtual-Tabletop-(VTT)-Alternative** zu Tools wie Roll20 und Foundry VTT zu werden.

Live: [table-heroes.de](https://table-heroes.de) · Repo: [cmd-Sven/tableheroes-website](https://github.com/cmd-Sven/tableheroes-website)

---

## Produkt (Was ist Table Heroes?)

Heute verbindet Table Heroes drei Dinge:

1. **Community & Marketing** — Landingpage, News, Community-Events, öffentliche Lore (Osnabrück / Kassadras u. a.)
2. **Kampagnen- & Weltbau-Tool** — Welten, NPCs, Fraktionen, Lore, Orte, Bestarium, Quests, Shops, Charakterbögen (u. a. DnD5e)
3. **Live-Session / Session Board** — gemeinsame Session-Oberfläche mit Kampf, Würfeln, Battlemap, Chronist (Audio→Text), Loot, Handheben u. v. m.

**Vision / Roadmap:** den Live-Tisch so ausbauen, dass Table Heroes als **VTT-Alternative zu Roll20 und Foundry** nutzbar ist (eigene Battlemap, Tokens, Combat, Medien, Sync) — parallel bleibt die Integration mit Foundry über das Bridge-Modul und die Sync-API erhalten.

> **Hinweis:** Was unten unter „Bereits umgesetzt“ steht, basiert auf dem aktuellen Code. VTT-Ziele wie vollständiges Fog of War oder ein kompletter Foundry-/Roll20-Ersatz sind **Roadmap**, nicht Status quo.

---

## Tech-Stack

| Bereich | Technik |
|--------|---------|
| Framework | **Next.js 16** (App Router), **React 19**, **TypeScript** |
| Styling / UI | **Tailwind CSS 4**, Lucide Icons, Framer Motion, Sonner |
| Backend / Auth / DB | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`), Postgres-Migrationen unter `supabase/migrations/` |
| Editor | **TipTap** (Rich Text / Markdown) |
| 3D-Würfel | **Three.js** + **React Three Fiber** / Drei |
| Battlemap | Canvas/Stage + **react-zoom-pan-pinch** |
| KI | **OpenAI** (u. a. Lore/NPC-Hilfe, Bildmodelle, Session-Chronik) |
| E-Mail | **Resend** (Cron: tägliche Notification-Mails via Vercel) |
| Deploy | **Vercel** (`vercel.json` mit Cron) |
| Optional | **Foundry VTT**-Modul `foundry-module/tableheroes-bridge` + REST unter `/api/v1/foundry-sync` |

Weitere Scripts: DnD5e-Katalog-Build (`catalog:dnd5e*`), Selftests für Progression und Würfel-Faces.

---

## Bereits umgesetzte Features (aus dem Code)

### Öffentlich / Community
- Marketing-Landingpage (Hero, Features, Termine, FAQ, Gamification, Systeme)
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
- **NPCs** (inkl. KI-Unterstützung, Portraits, Reveal für Spieler)
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
- Bedingungen / Mood / Biography & Flaws
- Ausrüstung, Gold/XP, Token-Generierung (inkl. KI-Bild)
- Spieler-Edit-Alerts

### Live-Session (Session Board) — Kern des VTT-Pfads
- Live-Session-Seite `/session/[sessionId]` und Gast-Join `/session/join/[token]`
- Side-Rail mit Panels (u. a. Aktivität, Szenen, Battlemaps, Chronik, Würfel)
- **Battlemap** (Session-Maps, Grid, Tokens Charakter/NSC/Kreatur, Props, Zoom/Pan lokal, Bewegungsreichweite inkl. Dash) — siehe auch `BATTLEMAP.md`
- Fog-of-War-Layer-Komponente vorhanden; laut Roadmap-Doku Phase 3 noch nicht fertig ausgebaut
- Combat / Initiative-Leiste, Conditions
- 3D-Würfel-Overlay (R3F)
- Handheben (Hand Raise)
- Szenen-Karten, Beast Cards, Loot (Chest, Draft, GM-Modals)
- Travel / Downtime
- Fate Coins, Tagesphase
- Session Wrap-up / Teilnahme-Belohnungen
- **Chronist**: Audio-Chunks, Transcription-APIs, Zusammenfassungen (OpenAI)

### Foundry-Integration (Bridge, kein Ersatz)
- Modul `foundry-module/tableheroes-bridge` (DnD5e): Punkte, Rang, Achievements, Wealth-/Portrait-Sync
- API: Profile, Sheet, Wealth, Portrait, Live-Session Sync

---

## Vision: VTT-Alternative (Roadmap)

**Ziel:** Table Heroes soll langfristig als **Virtual Tabletop** neben Roll20 und Foundry stehen — browserbasiert, kampagnenzentriert, mit eigener Live-Tisch-Erfahrung.

| Status | Themen |
|--------|--------|
| **Done / in Arbeit** | Session Board, Battlemap Phase 1–2.5 (Maps, Tokens, Bewegung), Combat-UI, Würfel, Medien/Szenen, Chronist, Foundry-Bridge |
| **Geplant (VTT)** | Fog of War ausbauen, Mood-Badges am Token, Initiative-Fokus, weitere Tisch-Features Richtung vollwertigem VTT |
| **Bewusst nicht** (aktuell laut `BATTLEMAP.md`) | Sync des SL-Viewports (Zoom/Pan bleibt lokal pro Client) |

Details zur Battlemap: [`BATTLEMAP.md`](./BATTLEMAP.md). Weitere Fach-Docs: `FACTIONS_SYSTEM_README.md`, `WORLD_LORE_SYSTEM.md`, `PLAYER_VIEW_UPDATE.md`, `PROJECT_STRUCTURE.md`.

**Roadmap auf GitHub:** Milestone [VTT-Alternative (Roll20 / Foundry)](https://github.com/cmd-Sven/tableheroes-website/milestone/1) — bestehende Features als geschlossene Issues (`status:done`), geplante VTT-Meilensteine als offene Issues (`status:planned`).

---

## Projektstruktur (Kurz)

```
tableheroes-website/
├── src/
│   ├── app/                 # Next.js App Router (Marketing, Auth, Dashboard, Session, API)
│   ├── components/          # UI (session, worlds, characters, landing, …)
│   └── lib/                 # Supabase, Queries, DnD5e, Session, Foundry-Sync, …
├── supabase/migrations/     # Schema-Evolution
├── foundry-module/          # Table Heroes Bridge für Foundry
├── scripts/                 # Katalog-Builds u. a.
├── public/                  # Statische Assets
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

Migrationen liegen unter `supabase/migrations/` (per Supabase CLI / Dashboard anwenden).

---

## Lizenz / Status

Privates Entwicklungsprojekt (`"private": true` in `package.json`), Version `0.1.0`. Fokus: Ausbau zum browserbasierten VTT bei gleichzeitig starkem Kampagnen- und Community-Tooling.
```