const TAB_NAME = "tableheroes";

export function getSheetRoot(sheet, html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  const element = sheet?.element;
  if (element instanceof HTMLElement) return element;
  if (element?.[0] instanceof HTMLElement) return element[0];
  return null;
}

export function resolveTabContainers(root) {
  if (!root) return { nav: null, body: null, tabGroup: "primary" };

  const nav =
    root.querySelector("nav.tabs") ??
    root.querySelector(".sheet-tabs") ??
    root.querySelector(".tabs");

  const body =
    root.querySelector(".tab-body") ??
    root.querySelector(".sheet-body") ??
    root.querySelector("section.tab.active")?.parentElement ??
    root.querySelector(".main-content")?.closest(".window-content") ??
    root.querySelector(".window-content");

  const existingTab = nav?.querySelector("[data-tab][data-group]");
  const tabGroup = existingTab?.dataset?.group ?? "primary";

  return { nav, body, tabGroup };
}

export function isApplicationV2Sheet(sheet) {
  return typeof sheet?.changeTab === "function";
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
}

export function patchSheetTabActivation(sheet, root, tabName, onActivate) {
  const { nav } = resolveTabContainers(root);
  nav?.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(`[data-tab="${tabName}"]`);
      if (!button) return;
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
