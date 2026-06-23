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
    sheet.changeTab(tabName, tabGroup, { force: true });
    return;
  }

  nav?.querySelectorAll(".item, [data-tab]").forEach((el) => {
    el.classList.remove("active");
    if (el.dataset.tab === tabName) el.classList.add("active");
  });

  body?.querySelectorAll(".tab").forEach((el) => {
    el.classList.remove("active");
    if (el.dataset.tab === tabName) el.classList.add("active");
  });
}

export { TAB_NAME };
