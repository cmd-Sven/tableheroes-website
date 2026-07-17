/**
 * Face-Mapping Selftest: Server-Face ↔ quaternion ↔ sichtbare Face.
 * Run: npx tsx src/lib/session/dice-face-mapping.selftest.ts
 */
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  diceReadingDirection,
  faceNormal,
  faceValueMostAligned,
  quaternionForFaceUp,
} from "./dice-3d-math";
import { DICE_CAMERA } from "./dice-screen-project";

const SIDES = [4, 6, 8, 10, 12, 20] as const;

function run() {
  const reading = diceReadingDirection(new THREE.Vector3());
  assert.ok(reading.length() > 0.99, "reading direction normalized");

  // Top-down: Lesrichtung = +Y (Kamera über dem Tisch)
  assert.ok(reading.dot(new THREE.Vector3(0, 1, 0)) > 0.999, "reading is +Y");

  for (const sides of SIDES) {
    for (let face = 1; face <= sides; face++) {
      const q = quaternionForFaceUp(sides, face);
      const aligned = faceValueMostAligned(sides, q, reading);
      assert.equal(
        aligned,
        face,
        `W${sides}: target ${face} but most-aligned is ${aligned}`,
      );

      const world = faceNormal(sides, face, new THREE.Vector3()).applyQuaternion(q);
      assert.ok(
        world.dot(reading) > 0.999,
        `W${sides} face ${face}: world normal not facing reading (dot=${world.dot(reading).toFixed(4)})`,
      );
    }
  }

  // Kamera-Sichtbarkeit von oben
  const camPos = new THREE.Vector3(...DICE_CAMERA.position);
  const lookAt = new THREE.Vector3(...DICE_CAMERA.lookAt);
  const towardCam = lookAt.clone().sub(camPos).normalize().negate();

  for (const sides of [6, 20] as const) {
    for (let face = 1; face <= sides; face++) {
      const q = quaternionForFaceUp(sides, face);
      const visible = faceValueMostAligned(sides, q, towardCam);
      assert.equal(
        visible,
        face,
        `W${sides}: camera sees ${visible} but server face is ${face}`,
      );
    }
  }

  console.log("dice-face-mapping.selftest: ok");
}

run();
