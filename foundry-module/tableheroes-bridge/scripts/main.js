import { scheduleTableHeroesTabInject } from "./sheet-tab.js";
import { MODULE_VERSION, thLocalize } from "./i18n.js";
import { fetchLiveSessionJoinUrl, settingsConfigured } from "./api.js";

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

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user) return;
  const tokenControls = controls.find((c) => c.name === "token");
  if (!tokenControls?.tools) return;

  tokenControls.tools.push({
    name: "tableheroes-live",
    title: thLocalize("TABLEHEROES.LiveSession.Tooltip"),
    icon: "fas fa-broadcast-tower",
    visible: true,
    onClick: async () => {
      if (!settingsConfigured()) {
        ui.notifications?.warn?.(thLocalize("TABLEHEROES.LiveSession.NotConfigured"));
        return;
      }
      try {
        const data = await fetchLiveSessionJoinUrl();
        if (data?.live && data.join_url) {
          window.open(data.join_url, "_blank", "noopener,noreferrer");
          ui.notifications?.info?.(thLocalize("TABLEHEROES.LiveSession.Opened"));
        } else {
          ui.notifications?.warn?.(thLocalize("TABLEHEROES.LiveSession.NotLive"));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ui.notifications?.error?.(message);
      }
    },
  });
});

function onRenderCharacterSheet(sheet, html) {
  if (sheet.actor?.type !== "character") return;
  scheduleTableHeroesTabInject(sheet, html);
}

function onRenderApplicationV2(app, element) {
  if (app.actor?.type !== "character") return;
  const name = app.constructor?.name ?? "";
  if (!name.includes("Character") && !name.includes("ActorSheet5e")) return;
  scheduleTableHeroesTabInject(app, element);
}

Hooks.on("closeActorSheet", (sheet) => {
  if (sheet._tableheroesInjectTimer) {
    window.clearTimeout(sheet._tableheroesInjectTimer);
    sheet._tableheroesInjectTimer = null;
  }
  sheet._tableheroesInjectLoopActive = false;
  sheet._tableheroesPanel = null;
});

Hooks.on("renderActorSheet5eCharacter2", onRenderCharacterSheet);
Hooks.on("renderActorSheet5eCharacter", onRenderCharacterSheet);
Hooks.on("renderActorSheet5e", onRenderCharacterSheet);
Hooks.on("renderBaseActorSheet", onRenderCharacterSheet);
Hooks.on("renderApplicationV2", onRenderApplicationV2);
