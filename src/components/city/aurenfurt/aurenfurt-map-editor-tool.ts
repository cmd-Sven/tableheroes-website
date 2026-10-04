/** Aktives Karten-Editor-Werkzeug (nur SL/Admin). null = geschlossen. */
export type AurenfurtMapEditorTool = "districts" | "streets" | "buildings" | "pois" | "walls";

export const AURENFURT_MAP_EDITOR_TOOLS: readonly AurenfurtMapEditorTool[] = [
  "districts",
  "streets",
  "buildings",
  "pois",
  "walls",
] as const;
