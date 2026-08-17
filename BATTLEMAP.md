# Battlemap — Stand & Roadmap

Live-Tisch-Karten im Session Board (`/session/[sessionId]`). Zoom/Pan bleibt **lokal pro Client**; Token-Positionen, Einstellungen und Charakter-Anzeige syncen für alle.

## Umgesetzt (Phase 1–3 Fog)

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
- `session_battlemap_tokens` + `characters` + `session_battlemap_fog_shapes` in Supabase Realtime
- Session-Broadcast mit **Token-/Display-/Fog-Snapshot** — ohne Warten auf DB-Reload
- Postgres-Realtime als Absicherung

### Props & SL-Tools
- Tisch-Props (NSC-Karte, Szenen-Bild) — blockieren keine Rasterzellen
- SL-Toolbar (aktive Map, Bewegungspause)

### Fog of War (manuell)
- Linke SL-Werkzeugleiste: Auswählen/Verschieben, Rechteck, Kreis, Löschen
- Ziehen auf dem Grid → schwarze Flächen (Größe = Drag)
- SL sieht halbtransparent + Goldrahmen; Spieler sehen deckend schwarz
- Flächen einzeln verschiebbar/löschbar; Persistenz über `campaign_battlemap_fog_presets` (Kampagne + Map-Bild) in die nächste Session

## Phase 4 (geplant)
- **Initiative-Sprung** — Fokus auf aktiven Zug

## Bewusst nicht geplant
- Follow-SL-Viewport (Zoom/Pan bleibt lokal)

## Relevante Pfade
- UI: `src/components/session/battlemap/` (`BattlemapFogLayer`, `BattlemapFogToolbar`)
- Board: `src/app/session/[sessionId]/LiveSessionBoard.tsx`
- Actions: `src/lib/actions/battlemap-actions.ts`
- Bridge/Sync: `src/lib/session/character-radial-bridge.ts`
- Migrationen u. a.: `20260719100000_session_battlemaps.sql`, `20260810083815_fix_battlemap_gm_token_world_npc.sql`, `20260810130412_battlemap_character_realtime_sync.sql`, `20260816140944_battlemap_manual_fog_of_war.sql`
