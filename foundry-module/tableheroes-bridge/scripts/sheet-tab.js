import {
  fetchActorProfile,
  readFoundryCurrency,
  settingsConfigured,
  syncActorPortrait,
  syncActorWealth,
  syncActorXp,
} from "./api.js";
import {
  activateTab,
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
  const L = game.i18n.localize;
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
  const L = game.i18n.localize;
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
  const L = game.i18n.localize;
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
  const L = game.i18n.localize;
  const player = payload?.player;
  const campaign = payload?.campaign;
  const foundryCurrency = readFoundryCurrency(actor);

  if (!settingsConfigured()) {
    return `<div class="tableheroes-sheet-tab tableheroes-error">
      <p>${escapeHtml("Bitte API-URL und API-Key in den Modul-Einstellungen hinterlegen.")}</p>
      ${renderActionsHtml(null, { compact: true })}
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
  badge.textContent = game.i18n.format("TABLEHEROES.Tab.HeaderBadge", {
    points: formatNumber(points),
  });
  title.appendChild(badge);
}

async function loadTabContent(sheet, actor, panel, root) {
  try {
    const payload = await loadProfile(actor, { force: false });
    panel.innerHTML = renderTabHtml(actor, payload);
    updateHeaderBadge(sheet, payload, root);
    bindTabEvents(sheet, actor, root);
  } catch (error) {
    panel.innerHTML = `<div class="tableheroes-sheet-tab tableheroes-error">
      <p>${escapeHtml(error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"))}</p>
      ${renderActionsHtml(null, { compact: true })}
    </div>`;
    bindTabEvents(sheet, actor, root);
  }
}

/**
 * @param {ActorSheet} sheet
 * @param {HTMLElement | jQuery | null} html
 */
export async function injectTableHeroesTab(sheet, html = null) {
  if (sheet.actor?.type !== "character") return;

  const root = getSheetRoot(sheet, html);
  if (!root) return;

  const { nav, body, tabGroup } = resolveTabContainers(root);
  if (!nav || !body) {
    console.warn("[tableheroes-bridge] Tab-Navigation nicht gefunden — neues D&D-Blatt?");
    return;
  }
  if (nav.querySelector(`[data-tab="${TAB_NAME}"]`) || body.querySelector(`[data-tab="${TAB_NAME}"]`)) {
    return;
  }

  const label = game.i18n.localize("TABLEHEROES.Tab.Label");
  const tabButton = document.createElement("a");
  tabButton.className = isApplicationV2Sheet(sheet) ? "item control" : "item";
  tabButton.dataset.tab = TAB_NAME;
  tabButton.dataset.group = tabGroup;
  if (isApplicationV2Sheet(sheet)) {
    tabButton.dataset.action = "tab";
    tabButton.dataset.tooltip = label;
    tabButton.setAttribute("aria-label", label);
  }
  if (isApplicationV2Sheet(sheet)) {
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
}

async function rerunTabRender(sheet, actor, root) {
  const payload = await loadProfile(actor, { force: true });
  const sheetRoot = root ?? getSheetRoot(sheet);
  const panel = sheetRoot?.querySelector(`[data-tab="${TAB_NAME}"]`);
  if (panel) panel.innerHTML = renderTabHtml(actor, payload);
  updateHeaderBadge(sheet, payload, sheetRoot);
  bindTabEvents(sheet, actor, sheetRoot);
  return payload;
}

function bindTabEvents(sheet, actor, root) {
  const sheetRoot = root ?? getSheetRoot(sheet);
  if (!sheetRoot) return;

  sheetRoot.querySelector(".tableheroes-refresh")?.addEventListener("click", async () => {
    try {
      await rerunTabRender(sheet, actor, sheetRoot);
      ui.notifications?.info(game.i18n.localize("TABLEHEROES.Tab.Refreshed"));
    } catch (error) {
      ui.notifications?.error(
        error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"),
      );
    }
  });

  sheetRoot.querySelector(".tableheroes-sync-xp")?.addEventListener("click", async () => {
    try {
      await syncActorXp(actor);
      ui.notifications?.info(game.i18n.localize("TABLEHEROES.Tab.SyncXpDone"));
    } catch (error) {
      ui.notifications?.error(
        error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"),
      );
    }
  });

  sheetRoot.querySelector(".tableheroes-sync-wealth-to-th")?.addEventListener("click", async () => {
    try {
      await syncActorWealth(actor, "foundry_to_th");
      await rerunTabRender(sheet, actor, sheetRoot);
      ui.notifications?.info(game.i18n.localize("TABLEHEROES.Tab.SyncWealthToThDone"));
    } catch (error) {
      ui.notifications?.error(
        error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"),
      );
    }
  });

  sheetRoot.querySelector(".tableheroes-sync-wealth-to-foundry")?.addEventListener("click", async () => {
    try {
      await syncActorWealth(actor, "th_to_foundry");
      await rerunTabRender(sheet, actor, sheetRoot);
      ui.notifications?.info(game.i18n.localize("TABLEHEROES.Tab.SyncWealthToFoundryDone"));
    } catch (error) {
      ui.notifications?.error(
        error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"),
      );
    }
  });

  sheetRoot.querySelector(".tableheroes-sync-portrait-to-th")?.addEventListener("click", async () => {
    try {
      await syncActorPortrait(actor, "foundry_to_th");
      await rerunTabRender(sheet, actor, sheetRoot);
      ui.notifications?.info(game.i18n.localize("TABLEHEROES.Tab.SyncPortraitToThDone"));
    } catch (error) {
      ui.notifications?.error(
        error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"),
      );
    }
  });

  sheetRoot.querySelector(".tableheroes-sync-portrait-to-foundry")?.addEventListener("click", async () => {
    try {
      await syncActorPortrait(actor, "th_to_foundry");
      await rerunTabRender(sheet, actor, sheetRoot);
      ui.notifications?.info(game.i18n.localize("TABLEHEROES.Tab.SyncPortraitToFoundryDone"));
    } catch (error) {
      ui.notifications?.error(
        error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"),
      );
    }
  });
}
