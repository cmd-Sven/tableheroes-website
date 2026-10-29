"use client";

import { useEffect, useState } from "react";
import type { CityBuilding } from "../aurenfurt-districts";
import type { AurenfurtPlaceLore } from "../aurenfurt-lore";
import type { AurenfurtMapPoi } from "../aurenfurt-map-pois";
import type { BuildingCategory } from "../aurenfurt-building-categories";
import { bindCityBonds, bindCityPressure } from "../aurenfurt-city-sim";
import {
  loadAurenfurtCityBonds,
  loadAurenfurtCityPressure,
  loadAurenfurtFactionRecordIds,
  loadAurenfurtNpcRecordIds,
} from "../load-aurenfurt-npc-records";
import { loadAurenfurtPlaceLore } from "../load-aurenfurt-place-lore";
import {
  loadAurenfurtCodeBuildingCategories,
  loadAurenfurtMapEditorBuildings,
} from "../aurenfurt-map-building-actions";
import { loadAurenfurtMapEditorPois } from "../aurenfurt-map-poi-actions";

/** Lädt Lore, POIs, Editor-Gebäude, NPC-/Fraktions-IDs und Bonds/Pressure einmalig beim Mount. */
export function useAurenfurtMapBootstrap() {
  const [editorBuildings, setEditorBuildings] = useState<CityBuilding[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, BuildingCategory>>({});
  const [pois, setPois] = useState<AurenfurtMapPoi[]>([]);
  const [places, setPlaces] = useState<AurenfurtPlaceLore[]>([]);
  const [npcRecordIds, setNpcRecordIds] = useState<Record<string, string> | null>(null);
  const [factionRecordIds, setFactionRecordIds] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    loadAurenfurtPlaceLore()
      .then((rows) => {
        if (active) setPlaces(rows);
      })
      .catch(() => {
        if (active) setPlaces([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadAurenfurtNpcRecordIds()
      .then((rows) => {
        if (active) setNpcRecordIds(rows);
      })
      .catch(() => {
        if (active) setNpcRecordIds({});
      });
    loadAurenfurtFactionRecordIds()
      .then((rows) => {
        if (active) setFactionRecordIds(rows);
      })
      .catch(() => {
        if (active) setFactionRecordIds({});
      });
    loadAurenfurtCityBonds()
      .then((bonds) => {
        if (active) bindCityBonds(bonds);
      })
      .catch(() => {
        if (active) bindCityBonds([]);
      });
    loadAurenfurtCityPressure()
      .then((pressure) => {
        if (active) bindCityPressure(pressure.actors, pressure.events);
      })
      .catch(() => {
        if (active) bindCityPressure([], []);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadAurenfurtMapEditorBuildings()
      .then((rows) => {
        if (active) setEditorBuildings(rows);
      })
      .catch(() => {
        if (active) setEditorBuildings([]);
      });
    loadAurenfurtCodeBuildingCategories()
      .then((rows) => {
        if (active) setCategoryOverrides(rows);
      })
      .catch(() => {
        /* Defaults aus BUILDING_CATEGORY_BY_ID bleiben */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    loadAurenfurtMapEditorPois()
      .then((rows) => {
        if (active) setPois(rows);
      })
      .catch(() => {
        if (active) setPois([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    editorBuildings,
    setEditorBuildings,
    categoryOverrides,
    setCategoryOverrides,
    pois,
    setPois,
    places,
    setPlaces,
    npcRecordIds,
    factionRecordIds,
  };
}
