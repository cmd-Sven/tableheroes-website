# Battlemap — Stand & Roadmap

Live-Tisch-Karten im Session Board (`/session/[sessionId]`). Zoom/Pan bleibt **lokal pro Client**; Token-Positionen, Einstellungen und Charakter-Anzeige syncen für alle.

## Umgesetzt (Phase 1–2.5+)

### Maps & Navigation
- Session-Maps, Grid-Kalibrierung (Prep), aktive Map über `active_battlemap_id`
- Zoom/Pan lokal (`react-zoom-pan-pinch`)
- Overlay-Navigation wie Google Maps: Pfeile (Pan), `+`/`−` mit Zoom-%, Einpassen
- Mausrad-Zoom aus (kein Page-Scroll-Konflikt)

### Tokens
- Charakter-, NSC- und Kreatur-Tokens auf dem Grid
- Side-Rail-Panel **Tokens** (Spieler / NPC / Monster) zur Platzierung
- Bewegungsreichweite aus `sheet_data.combat.speed` (5 ft = 1 Zelle, Chebyshev)
- Dash verdoppelt Reichweite; Erstplatzierung ohne Distanzlimit; SL ohne Limit
- Bewegungs-Pause (`battlemap_movement_paused`)
- Token-Einstellungen: HP-Balken (oben am Token), D&D-Größe, Sichtbarkeit (SL)
- Spieler-Tokens: gleiches Radialmenü wie Avatar (Gemüt, SL-Zustand, Waffen, …) inkl. Token-Einstellungen

### Anzeige & Zustände
- Live-Bild: Gemüt / SL-Zustand / Basis (wie Avatar)
- Zustand-Badge oben rechts (Anzahl) + Tooltip (`Name ist bezaubert, vergiftet.`)
- HP-Balken als schmaler Balken **oberhalb** des Tokens

### Sync (Just-in-Time)
- `session_battlemap_tokens` + `characters` in Supabase Realtime
- Session-Broadcast mit **Token-/Display-Snapshot** (Bewegung, HP-Balken, Größe, Zustände) — ohne Warten auf DB-Reload
- Postgres-Realtime als Absicherung

### Props & SL-Tools
- Tisch-Props (NSC-Karte, Szenen-Bild) — blockieren keine Rasterzellen
- SL-Toolbar (aktive Map, Bewegungspause)

## Phase 3 (geplant)
- **Fog of War** — `BattlemapFogLayer`, Zellen-Maske pro Map
- **Initiative-Sprung** — Fokus auf aktiven Zug

## Bewusst nicht geplant
- Follow-SL-Viewport (Zoom/Pan bleibt lokal)

## Relevante Pfade
- UI: `src/components/session/battlemap/`
- Board: `src/app/session/[sessionId]/LiveSessionBoard.tsx`
- Actions: `src/lib/actions/battlemap-actions.ts`
- Bridge/Sync: `src/lib/session/character-radial-bridge.ts`
- Migrationen u. a.: `20260719100000_session_battlemaps.sql`, `20260810083815_fix_battlemap_gm_token_world_npc.sql`, `20260810130412_battlemap_character_realtime_sync.sql`
