# Table Heroes Bridge (Foundry VTT)

Foundry-Modul für **DnD5e** (v12/v13): zeigt Table-Heroes-Punkte, Rang, TH-Level, Achievements und letzte Punkt-Buchungen am Charakterbogen.

## Tab-Layout (Wireframe)

```
┌─────────────────────────────────────────────────────────────┐
│  Charakterbogen — Barakas Reus    [TH 1.240 Pkt.]  ← Badge │
├─────────────────────────────────────────────────────────────┤
│ [Character] [Spells] [Inventory] [Effects] [★ Table Heroes] │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Guthaben     │  │ Lebenszeit   │  │ Rang         │       │
│  │   1.240      │  │   3.850      │  │ Abenteurer   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  Nächstes TH-Level ab 4.400 Pkt.          │
│  │ TH-Level 3   │                                            │
│  └──────────────┘                                            │
│                                                              │
│  ACHIEVEMENTS                                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Erste Session abgeschlossen          +50 · 13.06.   │    │
│  │ Treuer Gefährte                      +100 · 01.05.   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  LETZTE BUCHUNGEN                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ +50 Pkt. — Session-Teilnahme: Freitag    19.06.     │    │
│  │ +100 Pkt. — Achievement: …               13.06.     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [ Aktualisieren ]  [ Punkte-Katalog öffnen ↗ ]            │
└─────────────────────────────────────────────────────────────┘
```

Später erweiterbar im gleichen Tab: Session-Recap-Link, Chronist-Status, Foundry→TH XP-Sync-Button.

## Installation

1. Ordner `tableheroes-bridge` nach  
   `{FoundryData}/modules/tableheroes-bridge` kopieren  
   oder als Git-Submodule / Release-ZIP.
2. In Foundry: **Add-on Modules** → Table Heroes Bridge aktivieren.
3. **Einstellungen** (Welt, nur SL):
   - API-URL: `https://table-heroes.de`
   - API-Key: aus Table Heroes (Kampagne → Foundry Sync)
4. Charakterbogen öffnen → Tab **Table Heroes**.

## API (Table Heroes)

**GET** `/api/v1/foundry-sync/profile`

Header: `x-tableheroes-api-key: <kampagnen-key>`

Query (optional):

| Parameter | Beschreibung |
|---|---|
| `foundry_actor_id` | Nur ein Actor (empfohlen im Modul) |
| `achievements_limit` | Default 8, max 20 |
| `points_log_limit` | Default 5, max 10 |

### Beispiel-Antwort

```json
{
  "ok": true,
  "endpoint": "foundry-profile",
  "campaign_id": "6477a162-4c6d-484b-9bbe-7084cc2e6500",
  "campaign_name": "Kassadras – Zeitalter der Wiedergeburt",
  "dashboard_url": "https://table-heroes.de/dashboard/points",
  "points_catalog_url": "https://table-heroes.de/dashboard/points/catalog",
  "players": [
    {
      "foundry_actor_id": "Actor.JDCHjFwedGiy606x",
      "character_id": "…",
      "character_name": "Barakas Reus",
      "user_id": "…",
      "username": "Spielername",
      "mapped": true,
      "points": {
        "total": 1240,
        "lifetime": 3850,
        "rank_label": "Abenteurer",
        "level": 3,
        "next_level_at": 4400
      },
      "achievements": [
        {
          "id": "…",
          "name": "Erste Session",
          "points_awarded": 50,
          "awarded_at": "2026-06-13T10:00:00.000Z",
          "image_url": null
        }
      ],
      "recent_points": [
        {
          "amount": 50,
          "reason": "Session-Teilnahme",
          "created_at": "2026-06-19T21:00:00.000Z"
        }
      ]
    }
  ]
}
```

`mapped: false` wenn der Foundry-Actor noch keinem TH-Charakter zugeordnet ist.

## Voraussetzungen

- Foundry **v12+**, System **DnD5e 3.2+**
- Table-Heroes-Kampagne mit Foundry Sync API-Key
- `foundry_character_mapping` (Actor-ID ↔ TH-Charakter), wie beim XP-Sync

## Roadmap

- [ ] Achievement-Bilder im Tab
- [ ] XP-Sync-Button (POST `/api/v1/foundry-sync`) im Modul
- [ ] Optional: Read-only API-Key getrennt vom Sync-Key
- [ ] Spieler sehen nur eigene Daten (Actor-Besitz prüfen)
