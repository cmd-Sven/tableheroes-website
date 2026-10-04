"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { resolveBuildingUv, type BuildingPositions } from "../aurenfurt-building-positions";
import { findBuilding, findDistrict, type CityBuilding, type HoloSelection } from "../aurenfurt-districts";
import type { DistrictPolygons } from "../aurenfurt-district-polygons";
import { districtAnchor, polygonAnchor, surfacePoint } from "../scene/diorama-geometry";

type Controls = { target: THREE.Vector3 } | null;

type Options = {
  /** Während Straßenzeichnen: kein Fokus-Flug (Kamera steuert StreetDrawCameraRig). */
  paused?: boolean;
  buildings?: CityBuilding[];
  pois?: Array<{ id: string; u: number; v: number }>;
};

export function useHoloFocus(
  selection: HoloSelection | null,
  polygons?: DistrictPolygons | null,
  buildingPositions?: BuildingPositions | null,
  options?: Options,
) {
  const camera = useThree((state) => state.camera);
  const get = useThree((state) => state.get);
  const paused = options?.paused ?? false;
  const buildings = options?.buildings;
  const pois = options?.pois;
  const home = useMemo(() => new THREE.Vector3(0, 0.12, 0), []);
  const focus = useMemo(
    () => resolveFocus(selection, polygons, buildingPositions, buildings, pois),
    [buildingPositions, buildings, pois, polygons, selection],
  );
  const until = useRef(0);
  const selectionKey = selection ? `${selection.type}:${selection.id}` : "home";

  useEffect(() => {
    if (paused) return;
    until.current = performance.now() + 1300;
  }, [paused, selectionKey]);

  useFrame((_, delta) => {
    if (paused) return;
    const controls = get().controls as Controls;
    if (!controls?.target) return;
    const settling = performance.now() < until.current;
    const dest = focus?.point ?? home;
    if (focus || settling) {
      const k = 1 - Math.exp(-3.2 * delta);
      controls.target.lerp(dest, k);
    }
    if (!settling) return;
    const offset = camera.position.clone().sub(controls.target);
    const dist = offset.length();
    if (dist < 0.001) return;
    const desired = focus?.distance ?? 6.3;
    offset.setLength(THREE.MathUtils.damp(dist, desired, 2.5, delta));
    camera.position.copy(controls.target).add(offset);
  });
}

function resolveFocus(
  selection: HoloSelection | null,
  polygons?: DistrictPolygons | null,
  buildingPositions?: BuildingPositions | null,
  buildings?: CityBuilding[],
  pois?: Array<{ id: string; u: number; v: number }> | null,
) {
  if (!selection) return null;
  if (selection.type === "poi") {
    const poi = pois?.find((entry) => entry.id === selection.id);
    if (!poi) return null;
    return { point: surfacePoint(poi.u, poi.v), distance: 3.2 };
  }
  if (selection.type === "building") {
    const building = findBuilding(selection.id, buildings);
    if (!building) return null;
    const uv = resolveBuildingUv(building, buildingPositions);
    return { point: surfacePoint(uv.u, uv.v), distance: 3.4 };
  }
  const district = findDistrict(selection.id);
  if (!district) return null;
  const ring = polygons?.[district.id]?.points;
  return {
    point:
      ring && ring.length >= 3
        ? polygonAnchor(ring)
        : districtAnchor(district.start, district.end, district.inner, district.outer),
    distance: district.id === "palast" ? 3.8 : 4.7,
  };
}
