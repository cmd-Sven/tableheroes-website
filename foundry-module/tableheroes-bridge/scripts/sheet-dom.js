const TAB_NAME = "tableheroes";

export function getSheetRoot(sheet, html) {
  const element = sheet?.element;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

export function resolveTabContainers(root) {
  if (!root) return { nav: null, body: null, tabGroup: "primary" };

  const nav =
    root.querySelector("nav.tabs") ??
    root.querySelector("nav.tabs-right") ??
    root.querySelector(".sheet-tabs") ??
    root.querySelector("nav.sheet-tabs");

  const body =
    root.querySelector(".tab-body") ??
    root.querySelector(".sheet-body .tab-body") ??
    root.querySelector("section.tab-body");

  const existingTab = nav?.querySelector("[data-tab][data-group]");
  const tabGroup = existingTab?.dataset?.group ?? "primary";

  return { nav, body, tabGroup };
}

export function isApplicationV2Sheet(sheet) {
  return typeof sheet?.changeTab === "function";
}

export function findTabNavButton(nav, tabName = TAB_NAME) {
  if (!nav) return null;
  return nav.querySelector(`[data-tab="${tabName}"]`);
}

export function findTabPanel(root, tabName = TAB_NAME) {
  if (!root) return null;
  return (
    root.querySelector(`.tab-body .tab[data-tab="${tabName}"]`) ??
    root.querySelector(`.tab-body .tableheroes-tab[data-tab="${tabName}"]`) ??
    root.querySelector(`.tab[data-tab="${tabName}"]`) ??
    root.querySelector(`.tableheroes-tab[data-tab="${tabName}"]`)
  );
}

export function activateTab(sheet, root, tabGroup, tabName) {
  const { nav, body } = resolveTabContainers(root);

  if (typeof sheet?.changeTab === "function") {
    try {
      sheet.changeTab(tabName, tabGroup, { force: true });
    } catch {
      /* Custom tabs may not be registered in the sheet tab config. */
    }
  }

  nav?.querySelectorAll(".item, [data-tab]").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tabName);
  });

  body?.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tabName);
  });

  const panel = findTabPanel(body ?? root, tabName);
  panel?.classList.add("active");
}

export function patchSheetTabActivation(sheet, root, tabName, onActivate) {
  const { nav } = resolveTabContainers(root);
  if (!nav || nav.dataset.thTabPatchBound === "1") return;
  nav.dataset.thTabPatchBound = "1";

  nav.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(`[data-tab="${tabName}"]`);
      if (!button || !nav.contains(button)) return;
      onActivate();
    },
    true,
  );

  if (!sheet._tableheroesChangeTabPatched && typeof sheet.changeTab === "function") {
    sheet._tableheroesChangeTabPatched = true;
    const original = sheet.changeTab.bind(sheet);
    sheet.changeTab = function patchedChangeTab(tab, group, options) {
      original(tab, group, options);
      if (tab === tabName) onActivate();
    };
  }
}

export { TAB_NAME };
