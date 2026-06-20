import { fetchActorProfile, settingsConfigured } from "./api.js";

const MODULE_ID = "tableheroes-bridge";
const TAB_NAME = "tableheroes";
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

/**
 * @param {Actor} actor
 * @param {object | null} payload
 */
function renderTabHtml(actor, payload) {
  const L = game.i18n.localize;
  const player = payload?.player;
  const campaign = payload?.campaign;

  if (!settingsConfigured()) {
    return `<div class="tableheroes-sheet-tab tableheroes-error">${escapeHtml(
      "Bitte API-URL und API-Key in den Modul-Einstellungen hinterlegen.",
    )}</div>`;
  }

  if (!player) {
    return `<div class="tableheroes-sheet-tab tableheroes-muted">${escapeHtml(
      L("TABLEHEROES.Tab.Loading"),
    )}</div>`;
  }

  if (!player.mapped || !player.points) {
    return `<div class="tableheroes-sheet-tab">
      <p class="tableheroes-muted">${escapeHtml(L("TABLEHEROES.Tab.Unmapped"))}</p>
      <p class="tableheroes-muted"><strong>${escapeHtml(actor.name)}</strong></p>
    </div>`;
  }

  const points = player.points;
  const achievements = Array.isArray(player.achievements) ? player.achievements : [];
  const recent = Array.isArray(player.recent_points) ? player.recent_points : [];

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

    <h4 class="tableheroes-section-title">${escapeHtml(L("TABLEHEROES.Tab.Achievements"))}</h4>
    ${achievementsHtml}

    <h4 class="tableheroes-section-title">${escapeHtml(L("TABLEHEROES.Tab.RecentPoints"))}</h4>
    ${logHtml}

    <div class="tableheroes-actions">
      <button type="button" class="tableheroes-refresh">
        <i class="fas fa-sync"></i> ${escapeHtml(L("TABLEHEROES.Tab.Refresh"))}
      </button>
      ${
        campaign?.points_catalog_url
          ? `<a class="button" href="${escapeHtml(campaign.points_catalog_url)}" target="_blank" rel="noopener">
              <i class="fas fa-external-link-alt"></i> ${escapeHtml(L("TABLEHEROES.Tab.OpenDashboard"))}
            </a>`
          : ""
      }
    </div>
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

function updateHeaderBadge(sheet, payload) {
  const root = sheet.element?.[0] ?? sheet.element;
  if (!root) return;

  root.querySelector(".tableheroes-header-badge")?.remove();
  const points = payload?.player?.points?.total;
  if (points == null) return;

  const title = root.querySelector(".window-title");
  if (!title) return;

  const badge = document.createElement("span");
  badge.className = "tableheroes-header-badge";
  badge.textContent = game.i18n.format("TABLEHEROES.Tab.HeaderBadge", {
    points: formatNumber(points),
  });
  title.appendChild(badge);
}

function bindTabEvents(sheet, actor) {
  const root = sheet.element?.[0] ?? sheet.element;
  if (!root) return;

  const refreshBtn = root.querySelector(".tableheroes-refresh");
  refreshBtn?.addEventListener("click", async () => {
    try {
      const payload = await loadProfile(actor, { force: true });
      const panel = root.querySelector(`[data-tab="${TAB_NAME}"]`);
      if (panel) panel.innerHTML = renderTabHtml(actor, payload);
      updateHeaderBadge(sheet, payload);
      bindTabEvents(sheet, actor);
    } catch (error) {
      ui.notifications?.error(
        error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"),
      );
    }
  });
}

/**
 * @param {ActorSheet} sheet
 */
export async function injectTableHeroesTab(sheet) {
  if (sheet.actor?.type !== "character") return;

  const tabs = sheet.element?.find?.(".tabs")?.[0] ?? sheet.element?.querySelector?.(".tabs");
  const nav =
    sheet.element?.find?.(".sheet-tabs")?.[0] ??
    sheet.element?.querySelector?.(".sheet-tabs") ??
    tabs?.querySelector(".sheet-tabs");

  const body =
    sheet.element?.find?.(".tab-body")?.[0] ??
    sheet.element?.querySelector?.(".tab-body") ??
    sheet.element?.find?.(".sheet-body")?.[0] ??
    sheet.element?.querySelector?.(".sheet-body");

  if (!nav || !body) return;
  if (nav.querySelector(`[data-tab="${TAB_NAME}"]`)) return;

  const label = game.i18n.localize("TABLEHEROES.Tab.Label");
  const tabButton = document.createElement("a");
  tabButton.className = "item";
  tabButton.dataset.tab = TAB_NAME;
  tabButton.innerHTML = `<i class="fas fa-crown"></i> ${label}`;
  nav.appendChild(tabButton);

  const panel = document.createElement("div");
  panel.className = `tab tableheroes-tab`;
  panel.dataset.tab = TAB_NAME;
  panel.dataset.group = "primary";
  panel.innerHTML = renderTabHtml(sheet.actor, null);
  body.appendChild(panel);

  tabButton.addEventListener("click", async (event) => {
    event.preventDefault();
    nav.querySelectorAll(".item").forEach((el) => el.classList.remove("active"));
    body.querySelectorAll(".tab").forEach((el) => el.classList.remove("active"));
    tabButton.classList.add("active");
    panel.classList.add("active");

    try {
      const payload = await loadProfile(sheet.actor, { force: false });
      panel.innerHTML = renderTabHtml(sheet.actor, payload);
      updateHeaderBadge(sheet, payload);
      bindTabEvents(sheet, sheet.actor);
    } catch (error) {
      panel.innerHTML = `<div class="tableheroes-sheet-tab tableheroes-error">${escapeHtml(
        error instanceof Error ? error.message : game.i18n.localize("TABLEHEROES.Tab.Error"),
      )}</div>`;
    }
  });

  try {
    const payload = await loadProfile(sheet.actor, { force: false });
    updateHeaderBadge(sheet, payload);
  } catch {
    /* Badge optional */
  }
}
