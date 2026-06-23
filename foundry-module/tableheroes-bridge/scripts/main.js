import { injectTableHeroesTab } from "./sheet-tab.js";
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

function onRenderActorSheet(sheet, html) {
  if (sheet.actor?.type !== "character") return;
  void injectTableHeroesTab(sheet, html);
}

function onRenderApplicationV2(app, element) {
  if (app.actor?.type !== "character") return;
  const name = app.constructor?.name ?? "";
  if (!name.includes("Character")) return;
  void injectTableHeroesTab(app, element);
}

// Legacy ApplicationV1 / ältere dnd5e-Blätter
Hooks.on("renderActorSheet5e", onRenderActorSheet);
Hooks.on("renderActorSheet", onRenderActorSheet);

// dnd5e 3.x/4.x „Character Sheet 2“
Hooks.on("renderActorSheet5eCharacter2", onRenderActorSheet);

// dnd5e 5.0+ ApplicationV2 (Foundry v13)
Hooks.on("renderActorSheet5eCharacter", onRenderActorSheet);
Hooks.on("renderApplicationV2", onRenderApplicationV2);
Hooks.on("renderBaseActorSheet", onRenderActorSheet);
