/**
 * Wappen-Pfade der Aurenfurt-Viertel (Rail + Dashboard).
 */

import type { CityDistrictId } from "./aurenfurt-districts";

export const DISTRICT_CREST: Partial<Record<CityDistrictId, string>> = {
  adelsviertel: "/images/city/adelsviertel.png",
  tempelbezirk: "/images/city/tempelbezirk.png",
  handwerkerviertel: "/images/city/handwerkerviertel.png",
  palast: "/images/city/palast.png",
  suedtor: "/images/city/suedtor.png",
  unterstadt: "/images/city/unterstadt.png",
  akademieviertel: "/images/city/akademieviertel.png",
};

export function districtCrestSrc(id: CityDistrictId | null | undefined): string | null {
  if (!id) return null;
  return DISTRICT_CREST[id] ?? null;
}
