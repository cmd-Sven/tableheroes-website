/**
 * Teall-Pre-Rotation: Physik rollt frei aus, End-Face = Server-Face ohne späten Snap.
 * Run: npx tsx src/lib/session/dice-physics.selftest.ts
 */
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  diceReadingDirection,
  faceValueMostAligned,
} from "./dice-3d-math";
import { buildDiceTrajectories } from "./dice-physics";

const SIDES = [4, 6, 8, 10, 12, 20] as const;
const SEEDS = ["alpha", "bravo", "teall-17", "session-live"] as const;

function quatOf(frame: { qx: number; qy: number; qz: number; qw: number }): THREE.Quaternion {
  return new THREE.Quaternion(frame.qx, frame.qy, frame.qz, frame.qw).normalize();
}

function run() {
  const reading = diceReadingDirection(new THREE.Vector3());
  const qA = new THREE.Quaternion();
  const qB = new THREE.Quaternion();

  for (const sides of SIDES) {
    for (const seed of SEEDS) {
      for (let face = 1; face <= sides; face++) {
        const { trajectories } = buildDiceTrajectories({
          sides,
          faces: [face],
          seed: `${seed}:W${sides}:${face}`,
          throwDirX: 0.6,
          throwDirZ: -0.4,
          throwStrength: 0.72,
        });
        const frames = trajectories[0];
        assert.ok(frames && frames.length > 8, `W${sides} face ${face}: too few frames`);

        const last = frames[frames.length - 1]!;
        assert.equal(last.t, 1, `W${sides} face ${face}: last t must be 1`);

        const landed = faceValueMostAligned(sides, quatOf(last), reading);
        assert.equal(
          landed,
          face,
          `W${sides}: server ${face} but landed ${landed} (seed=${seed})`,
        );

        // Kein Sleep-Snap: im letzten Ausrollen (inkl. Settle) kein harter Sprung.
        let maxSleepDelta = 0;
        let maxLateDelta = 0;
        for (let i = 1; i < frames.length; i++) {
          const prev = frames[i - 1]!;
          const cur = frames[i]!;
          qA.set(prev.qx, prev.qy, prev.qz, prev.qw);
          qB.set(cur.qx, cur.qy, cur.qz, cur.qw);
          const delta = qA.angleTo(qB);
          if (prev.t >= 0.86) maxSleepDelta = Math.max(maxSleepDelta, delta);
          if (prev.t >= 0.92) maxLateDelta = Math.max(maxLateDelta, delta);
        }
        assert.ok(
          maxSleepDelta < 0.27,
          `W${sides} face ${face}: sleep snap ${maxSleepDelta.toFixed(3)} rad (seed=${seed})`,
        );
        assert.ok(
          maxLateDelta < 0.22,
          `W${sides} face ${face}: late snap ${maxLateDelta.toFixed(3)} rad (seed=${seed})`,
        );
      }
    }
  }

  // Mehrere Würfel, gemischte Server-Faces
  const multi = buildDiceTrajectories({
    sides: 6,
    faces: [1, 3, 6, 4],
    seed: "multi-teall",
    throwDirX: 1,
    throwDirZ: 0.2,
    throwStrength: 0.85,
  });
  assert.equal(multi.trajectories.length, 4);
  multi.trajectories.forEach((frames, i) => {
    const last = frames[frames.length - 1]!;
    const landed = faceValueMostAligned(6, quatOf(last), reading);
    assert.equal(landed, [1, 3, 6, 4][i], `multi die ${i}: landed ${landed}`);
  });

  console.log("dice-physics.selftest: ok");
}

run();
