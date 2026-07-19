# Battlemap — Roadmap

## Phase 1–2 (main)
- Session-Maps, Grid, Token (Charakter / NSC / Kreatur)
- SL aktiviert `active_battlemap_id` — alle Clients folgen
- Zoom/Pan **pro Client** (react-zoom-pan-pinch, kein Sync)
- Bewegungs-Pause (`battlemap_movement_paused`)
- Tisch-Props (NSC-Karte, Szenen-Bild) — **blockieren keine Rasterzellen**

## Phase 2.5 (Bewegung)
- Speed aus `characters.sheet_data.combat.speed` (5 ft = 1 Zelle)
- Chebyshev-Distanz (`max(|dx|,|dy|)`)
- Dash-Aktion verdoppelt Reichweite (`p_use_dash` am RPC)
- Erstplatzierung ohne Distanzlimit; SL ohne Limit

## Phase 3 (geplant)
- **Fog of War** — `BattlemapFogLayer`, Zellen-Maske pro Map
- **Mood-Badges** am Token (Anbindung Live-Avatar)
- **Initiative-Sprung** — Fokus auf aktiven Zug

## Bewusst nicht geplant
- Follow-SL-Viewport (Zoom/Pan bleibt lokal)
