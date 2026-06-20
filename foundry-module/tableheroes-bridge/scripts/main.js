import { injectTableHeroesTab } from "./sheet-tab.js";

const MODULE_ID = "tableheroes-bridge";

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "apiBaseUrl", {
    name: game.i18n.localize("TABLEHEROES.Settings.ApiBaseUrl.Name"),
    hint: game.i18n.localize("TABLEHEROES.Settings.ApiBaseUrl.Hint"),
    scope: "world",
    config: true,
    type: String,
    default: "https://table-heroes.de",
  });

  game.settings.register(MODULE_ID, "apiKey", {
    name: game.i18n.localize("TABLEHEROES.Settings.ApiKey.Name"),
    hint: game.i18n.localize("TABLEHEROES.Settings.ApiKey.Hint"),
    scope: "world",
    config: true,
    type: String,
    default: "",
  });

  game.settings.register(MODULE_ID, "refreshMinutes", {
    name: game.i18n.localize("TABLEHEROES.Settings.RefreshMinutes.Name"),
    hint: game.i18n.localize("TABLEHEROES.Settings.RefreshMinutes.Hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 5,
  });
});

function onRenderActorSheet(sheet, _html, _data) {
  if (sheet.actor?.type !== "character") return;
  void injectTableHeroesTab(sheet);
}

Hooks.on("renderActorSheet5e", onRenderActorSheet);
Hooks.on("renderActorSheet", onRenderActorSheet);
