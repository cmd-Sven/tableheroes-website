import {
  fetchActorProfile,
  readFoundryCurrency,
  settingsConfigured,
  syncActorPortrait,
  syncActorSheet,
  syncActorWealth,
  syncActorXp,
} from "./api.js";
import { thFormat, thLocalize } from "./i18n.js";
import {
  activateTab,
  findTabNavButton,
  findTabPanel,
  getSheetRoot,
  isApplicationV2Sheet,
  patchSheetTabActivation,
  resolveTabContainers,
  TAB_NAME,
} from "./sheet-dom.js";

const MODULE_ID = "tableheroes-bridge";
const profileCache = new Map();

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(Number(value) || 0);
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderWealthHtml(wealth, foundryCurrency) {
  const L = thLocalize;
  const rows = [
    { key: "pp", label: "PM" },
    { key: "gp", label: "GM" },
    { key: "ep", label: "EM" },
    { key: "sp", label: "SM" },
    { key: "cp", label: "KM" },
  ];

  const thCells = rows
    .map(
      (row) => `<div class="tableheroes-wealth-row">
        <span class="coin">${row.label}</span>
        <span class="amount">${formatNumber(wealth?.[row.key] ?? 0)}</span>
      </div>`,
    )
    .join("");

  const foundryCells = rows
    .map(
      (row) => `<div class="tableheroes-wealth-row">
        <span class="coin">${row.label}</span>
        <span class="amount">${formatNumber(foundryCurrency?.[row.key] ?? 0)}</span>
      </div>`,
    )
    .join("");

  const gmOnly = game.user.isGM
    ? `<div class="tableheroes-sync-actions">
        <button type="button" class="tableheroes-sync-wealth-to-th" title="${escapeHtml(
          L("TABLEHEROES.Tab.SyncWealthToThHint"),
        )}">
          <i class="fas fa-arrow-left"></i> ${escapeHtml(L("TABLEHEROES.Tab.SyncWealthToTh"))}
        </button>
        <button type="button" class="tableheroes-sync-wealth-to-foundry" title="${escapeHtml(
          L("TABLEHEROES.Tab.SyncWealthToFoundryHint"),
        )}">
          <i class="fas fa-arrow-right"></i> ${escapeHtml(L("TABLEHEROES.Tab.SyncWealthToFoundry"))}
        </button>
      </div>`
    : "";

  return `<div class="tableheroes-wealth-grid">
    <div class="tableheroes-wealth-column">
      <h5>${escapeHtml(L("TABLEHEROES.Tab.WealthTh"))}</h5>
      ${thCells}
    </div>
    <div class="tableheroes-wealth-column">
      <h5>${escapeHtml(L("TABLEHEROES.Tab.WealthFoundry"))}</h5>
      ${foundryCells}
    </div>
  </div>${gmOnly}`;
}

function renderPortraitHtml(player, actor) {
  const L = thLocalize;
  const thUrl = player?.portrait?.url ?? null;
  const foundryUrl = actor?.img ?? null;

  const thBlock = thUrl
    ? `<img src="${escapeHtml(thUrl)}" alt="TH Portrait" class="tableheroes-portrait-img" />`
    : `<div class="tableheroes-portrait-placeholder">${escapeHtml(L("TABLEHEROES.Tab.NoPortrait"))}</div>`;

  const foundryBlock = foundryUrl
    ? `<img src="${escapeHtml(foundryUrl)}" alt="Foundry Portrait" class="tableheroes-portrait-img" />`
    : `<div class="tableheroes-portrait-placeholder">${escapeHtml(L("TABLEHEROES.Tab.NoPortrait"))}</div>`;

  const gmOnly = game.user.isGM
    ? `<div class="tableheroes-sync-actions">
        <button type="button" class="tableheroes-sync-portrait-to-th">
          <i class="fas fa-arrow-left"></i> ${escapeHtml(L("TABLEHEROES.Tab.SyncPortraitToTh"))}
        </button>
        <button type="button" class="tableheroes-sync-portrait-to-foundry">
          <i class="fas fa-arrow-right"></i> ${escapeHtml(L("TABLEHEROES.Tab.SyncPortraitToFoundry"))}
        </button>
      </div>`
    : "";

  return `<div class="tableheroes-portrait-grid">
    <div class="tableheroes-portrait-column">
      <h5>Table Heroes</h5>
      ${thBlock}
    </div>
    <div class="tableheroes-portrait-column">
      <h5>Foundry</h5>
      ${foundryBlock}
    </div>
  </div>${gmOnly}`;
}

function renderActionsHtml(campaign, { compact = false } = {}) {
  const L = thLocalize;
  return `<div class="tableheroes-actions">
      <button type="button" class="tableheroes-refresh">
        <i class="fas fa-sync"></i> ${escapeHtml(L("TABLEHEROES.Tab.Refresh"))}
      </button>
      ${
        !compact && campaign?.points_catalog_url
          ? `<a class="button" href="${escapeHtml(campaign.points_catalog_url)}" target="_blank" rel="noopener">
              <i class="fas fa-external-link-alt"></i> ${escapeHtml(L("TABLEHEROES.Tab.OpenDashboard"))}
            </a>`
          : ""
      }
    </div>`;
}

/**
 * @param {Actor} actor
 * @param {object | null} payload
 */
function renderTabHtml(actor, payload) {
  const L = thLocalize;
  const player = payload?.player;
  const campaign = payload?.campaign;
  const foundryCurrency = readFoundryCurrency(actor);

  if (!settingsConfigured()) {
    return `<div class="tableheroes-sheet-tab tableheroes-error">
      <p>${escapeHtml("Bitte API-URL und API-Key in den Modul-Einstellungen hinterlegen.")}</p>
      ${renderActionsHtml(null, { compact: true })}
    </div>`;
  }

  if (payload?.error) {
    return `<div class="tableheroes-sheet-tab tableheroes-error">
      <p>${escapeHtml(payload.error)}</p>
      <p class="tableheroes-muted"><code>${escapeHtml(actor.id)}</code></p>
      ${renderActionsHtml(campaign, { compact: true })}
    </div>`;
  }

  if (payload?.fetched && !player) {
    return `<div class="tableheroes-sheet-tab tableheroes-error">
      <p>${escapeHtml("Keine Profildaten von Table Heroes erhalten. Prüfe API-URL (https://table-heroes.de), API-Key und Actor-Zuordnung.")}</p>
      <p class="tableheroes-muted"><code>${escapeHtml(actor.id)}</code></p>
      ${renderActionsHtml(campaign, { compact: true })}
    </div>`;
  }

  if (!player) {
    return `<div class="tableheroes-sheet-tab">
      <p class="tableheroes-muted">${escapeHtml(L("TABLEHEROES.Tab.Loading"))}</p>
      ${renderActionsHtml(campaign, { compact: true })}
    </div>`;
  }

  if (!player.mapped || !player.points) {
    return `<div class="tableheroes-sheet-tab">
      <p class="tableheroes-muted">${escapeHtml(L("TABLEHEROES.Tab.Unmapped"))}</p>
      <p class="tableheroes-muted"><strong>${escapeHtml(actor.name)}</strong></p>
      <p class="tableheroes-muted"><code>${escapeHtml(actor.id)}</code></p>
      ${renderActionsHtml(campaign, { compact: true })}
    </div>`;
  }

  const points = player.points;
  const achievements = Array.isArray(player.achievements) ? player.achievements : [];
  const recent = Array.isArray(player.recent_points) ? player.recent_points : [];
  const wealth = player.wealth ?? { gp: 0, sp: 0, cp: 0, ep: 0, pp: 0 };

  const achievementsHtml = achievements.length
    ? `<ul class="tableheroes-achievement-list">${achievements
        .map(
          (item) => `<li class="tableheroes-achievement-item">
            <div class="name">${escapeHtml(item.name)}</div>
            <div class="meta">+${formatNumber(item.points_awarded)} Pkt. · ${escapeHtml(
              formatDate(item.awarded_at),
            )}</div>
          </li>`,
        )
        .join("")}</ul>`
    : `<p class="tableheroes-muted">—</p>`;

  const logHtml = recent.length
    ? `<ul class="tableheroes-log-list">${recent
        .map(
          (entry) => `<li class="tableheroes-log-item">
            <div>${entry.amount >= 0 ? "+" : ""}${formatNumber(entry.amount)} Pkt. — ${escapeHtml(
              entry.reason,
            )}</div>
            <div class="meta">${escapeHtml(formatDate(entry.created_at))}</div>
          </li>`,
        )
        .join("")}</ul>`
    : `<p class="tableheroes-muted">—</p>`;

  const gmSyncBlock = game.user.isGM
    ? `<div class="tableheroes-sync-actions">
        <button type="button" class="tableheroes-sync-xp">
          <i class="fas fa-star"></i> ${escapeHtml(L("TABLEHEROES.Tab.SyncXp"))}
        </button>
        <button type="button" class="tableheroes-sync-sheet">
          <i class="fas fa-scroll"></i> ${escapeHtml(L("TABLEHEROES.Tab.SyncSheet"))}
        </button>
      </div>`
    : "";

  return `<div class="tableheroes-sheet-tab" data-actor-id="${escapeHtml(actor.id)}">
    <div class="tableheroes-points-grid">
      <div class="tableheroes-stat-card">
        <div class="label">${escapeHtml(L("TABLEHEROES.Tab.PointsTotal"))}</div>
        <div class="value">${formatNumber(points.total)}</div>
      </div>
      <div class="tableheroes-stat-card">
        <div class="label">${escapeHtml(L("TABLEHEROES.Tab.PointsLifetime"))}</div>
        <div class="value">${formatNumber(points.lifetime)}</div>
      </div>
      <div class="tableheroes-stat-card">
        <div class="label">${escapeHtml(L("TABLEHEROES.Tab.Rank"))}</div>
        <div class="value">${escapeHtml(points.rank_label)}</div>
      </div>
      <div class="tableheroes-stat-card">
        <div class="label">${escapeHtml(L("TABLEHEROES.Tab.Level"))}</div>
        <div class="value">${formatNumber(points.level)}</div>
      </div>
    </div>
    <p class="tableheroes-muted">${escapeHtml(L("TABLEHEROES.Tab.NextLevel"))}: ${formatNumber(
      points.next_level_at ?? 0,
    )} Pkt.</p>

    <h4 class="tableheroes-section-title">${escapeHtml(L("TABLEHEROES.Tab.Portrait"))}</h4>
    ${renderPortraitHtml(player, actor)}

    <h4 class="tableheroes-section-title">${escapeHtml(L("TABLEHEROES.Tab.Wealth"))}</h4>
    ${renderWealthHtml(wealth, foundryCurrency)}

    <h4 class="tableheroes-section-title">${escapeHtml(L("TABLEHEROES.Tab.Achievements"))}</h4>
    ${achievementsHtml}

    <h4 class="tableheroes-section-title">${escapeHtml(L("TABLEHEROES.Tab.RecentPoints"))}</h4>
    ${logHtml}

    ${gmSyncBlock}

    ${renderActionsHtml(campaign)}
  </div>`;
}

async function loadProfile(actor, { force = false } = {}) {
  const cacheKey = actor.id;
  if (!force && profileCache.has(cacheKey)) {
    return profileCache.get(cacheKey);
  }

  const payload = await fetchActorProfile(actor.id);
  payload.fetched = true;
  profileCache.set(cacheKey, payload);
  return payload;
}

function updateHeaderBadge(sheet, payload, root) {
  const sheetRoot = root ?? getSheetRoot(sheet);
  if (!sheetRoot) return;

  sheetRoot.querySelector(".tableheroes-header-badge")?.remove();
  const points = payload?.player?.points?.total;
  if (points == null) return;

  const title = sheetRoot.querySelector(".window-title");
  if (!title) return;

  const badge = document.createElement("span");
  badge.className = "tableheroes-header-badge";
  badge.textContent = thFormat("TABLEHEROES.Tab.HeaderBadge", {
    points: formatNumber(points),
  });
  title.appendChild(badge);
}

async function loadTabContent(sheet, actor, panel, root) {
  try {
    const payload = await loadProfile(actor, { force: false });
    panel.innerHTML = renderTabHtml(actor, payload);
    updateHeaderBadge(sheet, payload, root);
    bindTabEvents(sheet, actor, root, panel);
  } catch (error) {
    panel.innerHTML = `<div class="tableheroes-sheet-tab tableheroes-error">
      <p>${escapeHtml(error instanceof Error ? error.message : thLocalize("TABLEHEROES.Tab.Error"))}</p>
      ${renderActionsHtml(null, { compact: true })}
    </div>`;
    bindTabEvents(sheet, actor, root, panel);
  }
}

function isTabComplete(sheet) {
  const root = getSheetRoot(sheet);
  if (!root) return false;
  const { nav, body } = resolveTabContainers(root);
  return Boolean(
    findTabNavButton(nav, TAB_NAME) && findTabPanel(body ?? root, TAB_NAME),
  );
}

/**
 * @param {ActorSheet} sheet
 * @param {HTMLElement | jQuery | null} html
 */
export async function injectTableHeroesTab(sheet, html = null) {
  if (sheet.actor?.type !== "character") return false;

  try {
    const root = getSheetRoot(sheet, html);
    if (!root) return false;

    const { nav, body, tabGroup } = resolveTabContainers(root);
    if (!nav || !body) {
      return false;
    }

    const existingNav = findTabNavButton(nav, TAB_NAME);
    const existingPanel = findTabPanel(body, TAB_NAME);

    if (existingNav && existingPanel) {
      sheet._tableheroesPanel = existingPanel;
      void loadTabContent(sheet, sheet.actor, existingPanel, root);
      return true;
    }

    existingNav?.remove();
    existingPanel?.remove();

    const label = thLocalize("TABLEHEROES.Tab.Label");
    const tabButton = document.createElement("a");
    tabButton.className = isApplicationV2Sheet(sheet) ? "item control" : "item";
    tabButton.dataset.tab = TAB_NAME;
    tabButton.dataset.group = tabGroup;
    if (isApplicationV2Sheet(sheet)) {
      tabButton.dataset.action = "tab";
      tabButton.dataset.tooltip = label;
      tabButton.setAttribute("aria-label", label);
      tabButton.innerHTML = `<i class="fas fa-crown"></i>`;
    } else {
      tabButton.innerHTML = `<i class="fas fa-crown"></i> ${escapeHtml(label)}`;
    }
    nav.appendChild(tabButton);

    const panel = document.createElement("div");
    panel.className = "tab tableheroes-tab";
    panel.dataset.tab = TAB_NAME;
    panel.dataset.group = tabGroup;
    panel.innerHTML = renderTabHtml(sheet.actor, null);
    body.appendChild(panel);
    sheet._tableheroesPanel = panel;

    const refreshTab = () => loadTabContent(sheet, sheet.actor, panel, root);

    patchSheetTabActivation(sheet, root, TAB_NAME, () => {
      void refreshTab();
    });

    tabButton.addEventListener("click", (event) => {
      event.preventDefault();
      activateTab(sheet, root, tabGroup, TAB_NAME);
      void refreshTab();
    });

    void refreshTab();
    console.log(
      `[tableheroes-bridge] Tab eingefügt für ${sheet.actor?.name} (${sheet.actor?.id})`,
    );
    return true;
  } catch (error) {
    console.error("[tableheroes-bridge] Tab-Injection fehlgeschlagen:", error);
    return false;
  }
}

const MAX_INJECT_ATTEMPTS = 50;
const INJECT_INTERVAL_MS = 120;

/**
 * Retry until tab exists — data-heavy sheets (mapped PCs) re-render repeatedly and
 * cancel one-shot timeouts before inject runs.
 */
export function scheduleTableHeroesTabInject(sheet, html = null) {
  if (sheet.actor?.type !== "character") return;
  if (isTabComplete(sheet)) return;

  if (sheet._tableheroesInjectLoopActive) return;
  sheet._tableheroesInjectLoopActive = true;

  let attempt = 0;

  const tick = async () => {
    attempt += 1;
    const root = getSheetRoot(sheet);
    const { nav, body } = resolveTabContainers(root);

    if (!isTabComplete(sheet)) {
      if (nav && body) {
        await injectTableHeroesTab(sheet);
      }
    }

    if (isTabComplete(sheet)) {
      sheet._tableheroesInjectLoopActive = false;
      return;
    }

    if (attempt >= MAX_INJECT_ATTEMPTS) {
      sheet._tableheroesInjectLoopActive = false;
      console.warn(
        `[tableheroes-bridge] Tab konnte nicht eingefügt werden: ${sheet.actor?.name} (${sheet.actor?.id})`,
        { nav: !!nav, body: !!body, attempts: attempt },
      );
      return;
    }

    sheet._tableheroesInjectTimer = window.setTimeout(() => {
      void tick();
    }, INJECT_INTERVAL_MS);
  };

  if (sheet._tableheroesInjectTimer) {
    window.clearTimeout(sheet._tableheroesInjectTimer);
  }
  sheet._tableheroesInjectTimer = window.setTimeout(() => {
    void tick();
  }, 80);
}

async function rerunTabRender(sheet, actor, root, panel = null) {
  const payload = await loadProfile(actor, { force: true });
  const sheetRoot = root ?? getSheetRoot(sheet);
  const tabPanel =
    panel ?? sheet._tableheroesPanel ?? findTabPanel(sheetRoot, TAB_NAME);
  if (tabPanel) tabPanel.innerHTML = renderTabHtml(actor, payload);
  updateHeaderBadge(sheet, payload, sheetRoot);
  bindTabEvents(sheet, actor, sheetRoot, tabPanel);
  return payload;
}

function bindTabEvents(sheet, actor, root, panel = null) {
  const sheetRoot = root ?? getSheetRoot(sheet);
  if (!sheetRoot) return;

  const tabPanel =
    panel ?? sheet._tableheroesPanel ?? findTabPanel(sheetRoot, TAB_NAME);
  if (!tabPanel || tabPanel.dataset.thEventsBound === "1") return;
  tabPanel.dataset.thEventsBound = "1";

  tabPanel.addEventListener("click", async (event) => {
    const target = event.target.closest("button, a.button");
    if (!target) return;

    if (target.classList.contains("tableheroes-refresh")) {
      try {
        const payload = await rerunTabRender(sheet, actor, sheetRoot, tabPanel);
        if (payload?.player?.mapped && payload.player.points) {
          ui.notifications?.info(thLocalize("TABLEHEROES.Tab.Refreshed"));
        } else if (payload?.error) {
          ui.notifications?.error(payload.error);
        } else {
          ui.notifications?.warn(
            "Keine Daten — Actor in Table Heroes zuordnen oder API-Einstellungen prüfen.",
          );
        }
      } catch (error) {
        ui.notifications?.error(
          error instanceof Error ? error.message : thLocalize("TABLEHEROES.Tab.Error"),
        );
      }
      return;
    }

    if (target.classList.contains("tableheroes-sync-xp")) {
      try {
        await syncActorXp(actor);
        ui.notifications?.info(thLocalize("TABLEHEROES.Tab.SyncXpDone"));
      } catch (error) {
        ui.notifications?.error(
          error instanceof Error ? error.message : thLocalize("TABLEHEROES.Tab.Error"),
        );
      }
      return;
    }

    if (target.classList.contains("tableheroes-sync-sheet")) {
      try {
        await syncActorSheet(actor);
        ui.notifications?.info(thLocalize("TABLEHEROES.Tab.SyncSheetDone"));
      } catch (error) {
        ui.notifications?.error(
          error instanceof Error ? error.message : thLocalize("TABLEHEROES.Tab.Error"),
        );
      }
      return;
    }

    if (target.classList.contains("tableheroes-sync-wealth-to-th")) {
      try {
        await syncActorWealth(actor, "foundry_to_th");
        await rerunTabRender(sheet, actor, sheetRoot, tabPanel);
        ui.notifications?.info(thLocalize("TABLEHEROES.Tab.SyncWealthToThDone"));
      } catch (error) {
        ui.notifications?.error(
          error instanceof Error ? error.message : thLocalize("TABLEHEROES.Tab.Error"),
        );
      }
      return;
    }

    if (target.classList.contains("tableheroes-sync-wealth-to-foundry")) {
      try {
        await syncActorWealth(actor, "th_to_foundry");
        await rerunTabRender(sheet, actor, sheetRoot, tabPanel);
        ui.notifications?.info(thLocalize("TABLEHEROES.Tab.SyncWealthToFoundryDone"));
      } catch (error) {
        ui.notifications?.error(
          error instanceof Error ? error.message : thLocalize("TABLEHEROES.Tab.Error"),
        );
      }
      return;
    }

    if (target.classList.contains("tableheroes-sync-portrait-to-th")) {
      try {
        await syncActorPortrait(actor, "foundry_to_th");
        await rerunTabRender(sheet, actor, sheetRoot, tabPanel);
        ui.notifications?.info(thLocalize("TABLEHEROES.Tab.SyncPortraitToThDone"));
      } catch (error) {
        ui.notifications?.error(
          error instanceof Error ? error.message : thLocalize("TABLEHEROES.Tab.Error"),
        );
      }
      return;
    }

    if (target.classList.contains("tableheroes-sync-portrait-to-foundry")) {
      try {
        await syncActorPortrait(actor, "th_to_foundry");
        await rerunTabRender(sheet, actor, sheetRoot, tabPanel);
        ui.notifications?.info(thLocalize("TABLEHEROES.Tab.SyncPortraitToFoundryDone"));
      } catch (error) {
        ui.notifications?.error(
          error instanceof Error ? error.message : thLocalize("TABLEHEROES.Tab.Error"),
        );
      }
    }
  });
}
