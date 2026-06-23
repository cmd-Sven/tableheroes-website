import { scheduleTableHeroesTabInject } from "./sheet-tab.js";
import { MODULE_VERSION, thLocalize } from "./i18n.js";

const MODULE_ID = "tableheroes-bridge";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "apiBaseUrl", {
    name: thLocalize("TABLEHEROES.Settings.ApiBaseUrl.Name"),
    hint: thLocalize("TABLEHEROES.Settings.ApiBaseUrl.Hint"),
    scope: "world",
    config: true,
    type: String,
    default: "https://table-heroes.de",
  });

  game.settings.register(MODULE_ID, "apiKey", {
    name: thLocalize("TABLEHEROES.Settings.ApiKey.Name"),
    hint: thLocalize("TABLEHEROES.Settings.ApiKey.Hint"),
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "refreshMinutes", {
    name: thLocalize("TABLEHEROES.Settings.RefreshMinutes.Name"),
    hint: thLocalize("TABLEHEROES.Settings.RefreshMinutes.Hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 5,
  });
});

Hooks.once("ready", () => {
  console.log(`[tableheroes-bridge] Modul geladen v${MODULE_VERSION}`);
});

function onRenderCharacterSheet(sheet, html) {
  if (sheet.actor?.type !== "character") return;
  scheduleTableHeroesTabInject(sheet, html);
}

Hooks.on("closeActorSheet", (sheet) => {
  if (sheet._tableheroesInjectTimer) {
    window.clearTimeout(sheet._tableheroesInjectTimer);
    sheet._tableheroesInjectTimer = null;
  }
  sheet._tableheroesPanel = null;
});

// dnd5e 5.0 Character Sheet 2 (Foundry v13) — primary target
Hooks.on("renderActorSheet5eCharacter2", onRenderCharacterSheet);

// Legacy / other dnd5e character sheets
Hooks.on("renderActorSheet5eCharacter", onRenderCharacterSheet);
Hooks.on("renderActorSheet5e", onRenderCharacterSheet);
