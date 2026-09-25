"use client";

import type { HoloSelection } from "../aurenfurt-districts";
import { useHoloFocus } from "../hooks/useHoloFocus";

type Props = {
  selection: HoloSelection | null;
};

export function HoloFocusRig({ selection }: Props) {
  useHoloFocus(selection);
  return null;
}
