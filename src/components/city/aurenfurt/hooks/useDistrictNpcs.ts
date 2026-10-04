"use client";

import { useMemo } from "react";
import type { CityDistrictId } from "../aurenfurt-districts";
import {
  factionLeadersForDistrict,
  operatorForLocation,
  withDistrictModulation,
  type AurenfurtNpc,
} from "../aurenfurt-npcs";
import { parseDay, utcToday } from "../aurenfurt-history";

export type DistrictNpcs = {
  /** Anführer von Fraktionen mit Präsenz im Viertel */
  leaders: AurenfurtNpc[];
  /** Betreiber der aktuell gewählten Key-Location */
  operator: AurenfurtNpc | null;
};

/**
 * Liefert Anführer des Viertels und den Betreiber der gewählten Location.
 * Einfluss/Intel werden leicht an Tages-Kennzahlen moduliert; Identität bleibt stabil.
 */
export function useDistrictNpcs(
  districtId: CityDistrictId | null,
  buildingId: string | null = null,
  recordIds: Record<string, string> | null = null,
  dayIso?: string,
): DistrictNpcs {
  const today = useMemo(() => (dayIso ? parseDay(dayIso) : utcToday()), [dayIso]);

  return useMemo(() => {
    const link = (npc: AurenfurtNpc): AurenfurtNpc => {
      const recordId = recordIds?.[npc.id];
      if (!recordId || recordId === npc.recordId) return npc;
      return { ...npc, recordId };
    };

    if (!districtId) {
      return {
        leaders: [],
        operator: buildingId
          ? (() => {
              const op = operatorForLocation(buildingId);
              return op ? link(withDistrictModulation(op, today)) : null;
            })()
          : null,
      };
    }

    const leaders = factionLeadersForDistrict(districtId).map((npc) =>
      link(withDistrictModulation(npc, today)),
    );
    const rawOperator = operatorForLocation(buildingId);
    const operator = rawOperator ? link(withDistrictModulation(rawOperator, today)) : null;

    return { leaders, operator };
  }, [districtId, buildingId, recordIds, today]);
}
