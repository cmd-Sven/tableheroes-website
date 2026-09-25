"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { findBuilding, findDistrict, type HoloSelection } from "../aurenfurt-districts";
import { districtAnchor, surfacePoint } from "../scene/diorama-geometry";

type Controls = { target: THREE.Vector3 } | null;

export function useHoloFocus(selection: HoloSelection | null) {
  const camera = useThree((state) => state.camera);
  const get = useThree((state) => state.get);
  const home = useMemo(() => new THREE.Vector3(0, 0.12, 0), []);
  const focus = useMemo(() => resolveFocus(selection), [selection]);
  const until = useRef(0);
  const selectionKey = selection ? `${selection.type}:${selection.id}` : "home";

  useEffect(() => {
    until.current = performance.now() + 1300;
  }, [selectionKey]);

  useFrame((_, delta) => {
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

function resolveFocus(selection: HoloSelection | null) {
  if (!selection) return null;
  if (selection.type === "building") {
    const building = findBuilding(selection.id);
    if (!building) return null;
    return { point: surfacePoint(building.u, building.v), distance: 3.4 };
  }
  const district = findDistrict(selection.id);
  if (!district) return null;
  return {
    point: districtAnchor(district.start, district.end, district.inner, district.outer),
    distance: district.id === "palast" ? 3.8 : 4.7,
  };
}
