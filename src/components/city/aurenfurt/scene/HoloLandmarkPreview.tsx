"use client";

import type { LandmarkModel } from "../aurenfurt-districts";

type Props = {
  model: LandmarkModel;
};

/**
 * Kein zweites WebGL-Canvas. Die Drehvorschau hat denselben GLB noch einmal
 * in einen eigenen Renderer geladen, auf derselben Seite wie die Stadtkarte.
 * Das Modell bleibt auf der Karte; die Leiste ändert sich nicht.
 */
export default function HoloLandmarkPreview({ model }: Props) {
  void model;
  return null;
}
