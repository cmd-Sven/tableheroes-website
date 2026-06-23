/** Fallback strings when module translations are not loaded (e.g. Foundry UI language = en). */
const FALLBACKS = {
  "TABLEHEROES.Tab.Label": "Table Heroes",
  "TABLEHEROES.Tab.Unmapped":
    "Dieser Foundry-Actor ist noch keinem Table-Heroes-Charakter zugeordnet.",
  "TABLEHEROES.Tab.PointsTotal": "Guthaben",
  "TABLEHEROES.Tab.PointsLifetime": "Lebenszeit",
  "TABLEHEROES.Tab.Rank": "Rang",
  "TABLEHEROES.Tab.Level": "TH-Level",
  "TABLEHEROES.Tab.NextLevel": "Nächstes Level ab",
  "TABLEHEROES.Tab.Achievements": "Achievements",
  "TABLEHEROES.Tab.RecentPoints": "Letzte Buchungen",
  "TABLEHEROES.Tab.OpenDashboard": "Punkte-Katalog öffnen",
  "TABLEHEROES.Tab.Refresh": "Aktualisieren",
  "TABLEHEROES.Tab.Refreshed": "Table-Heroes-Daten aktualisiert.",
  "TABLEHEROES.Tab.Loading": "Lade Table-Heroes-Daten…",
  "TABLEHEROES.Tab.Error": "Daten konnten nicht geladen werden.",
  "TABLEHEROES.Tab.HeaderBadge": "TH {points} Pkt.",
  "TABLEHEROES.Tab.Portrait": "Portrait",
  "TABLEHEROES.Tab.Wealth": "Geldbörse",
  "TABLEHEROES.Tab.WealthTh": "Table Heroes",
  "TABLEHEROES.Tab.WealthFoundry": "Foundry",
  "TABLEHEROES.Tab.NoPortrait": "Kein Bild",
  "TABLEHEROES.Tab.SyncWealthToTh": "Geld → TH",
  "TABLEHEROES.Tab.SyncWealthToThHint": "Foundry-Geldbörse nach Table Heroes übertragen",
  "TABLEHEROES.Tab.SyncWealthToThDone": "Geldbörse nach Table Heroes synchronisiert.",
  "TABLEHEROES.Tab.SyncWealthToFoundry": "Geld → Foundry",
  "TABLEHEROES.Tab.SyncWealthToFoundryHint": "Table-Heroes-Geldbörse nach Foundry übertragen",
  "TABLEHEROES.Tab.SyncWealthToFoundryDone": "Geldbörse nach Foundry synchronisiert.",
  "TABLEHEROES.Tab.SyncPortraitToTh": "Portrait → TH",
  "TABLEHEROES.Tab.SyncPortraitToThDone": "Portrait nach Table Heroes synchronisiert.",
  "TABLEHEROES.Tab.SyncPortraitToFoundry": "Portrait → Foundry",
  "TABLEHEROES.Tab.SyncPortraitToFoundryDone": "Portrait nach Foundry synchronisiert.",
  "TABLEHEROES.Tab.SyncXp": "XP → TH",
  "TABLEHEROES.Tab.SyncXpDone": "XP nach Table Heroes synchronisiert.",
  "TABLEHEROES.Settings.ApiBaseUrl.Name": "Table Heroes API-URL",
  "TABLEHEROES.Settings.ApiBaseUrl.Hint":
    "Basis-URL ohne Slash am Ende, z. B. https://table-heroes.de",
  "TABLEHEROES.Settings.ApiKey.Name": "Kampagnen API-Key",
  "TABLEHEROES.Settings.ApiKey.Hint":
    "Aus den Table-Heroes-Kampagneneinstellungen (Foundry Sync).",
  "TABLEHEROES.Settings.RefreshMinutes.Name": "Aktualisierung (Minuten)",
  "TABLEHEROES.Settings.RefreshMinutes.Hint":
    "Wie oft Punkte im Hintergrund neu geladen werden.",
};

export function thLocalize(key) {
  try {
    if (game?.i18n?.has?.(key)) return game.i18n.localize(key);
    const value = game?.i18n?.localize?.(key);
    if (value && value !== key) return value;
  } catch (error) {
    console.warn("[tableheroes-bridge] i18n lookup failed:", key, error);
  }
  return FALLBACKS[key] ?? key;
}

export function thFormat(key, data = {}) {
  try {
    if (game?.i18n?.format) return game.i18n.format(key, data);
  } catch {
    /* use fallback */
  }
  let text = FALLBACKS[key] ?? key;
  for (const [name, value] of Object.entries(data)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
