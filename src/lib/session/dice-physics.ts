import * as THREE from "three";
import { createSeededRng } from "@/src/lib/session/dice-roll";
import { dieScale, quaternionForFaceUp } from "@/src/lib/session/dice-3d-math";

export const DICE_PHYSICS_DURATION_MS = 2600;
export const DICE_SETTLE_START = 0.58;

const TABLE_Y = 0;
const GRAVITY = -32;
const RESTITUTION = 0.48;
const FRICTION = 0.78;
const SPIN_DAMP = 0.86;
const SIM_STEPS = 96;
const _tmpQuat = new THREE.Quaternion();

export type DieKeyframe = {
  t: number;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
};

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return u * u * (3 - 2 * u);
}

/**
 * Baut eine deterministische Bounce-/Roll-Trajektorie (Tisch-Kollision).
 * Letzte Phase slerpt fest auf die Server-Face (Augenzahl oben).
 */
export function buildDieTrajectory(opts: {
  sides: number;
  face: number;
  seed: string;
  index: number;
  count: number;
}): DieKeyframe[] {
  const { sides, face, seed, index, count } = opts;
  const rng = createSeededRng(`${seed}:traj:${index}`);
  const r = () => rng();

  const scale = dieScale(sides);
  const half = 0.55 * scale;
  const targetQ = quaternionForFaceUp(sides, face);

  const spread = Math.max(1.05, Math.min(2.15, 4.0 / Math.max(1, count)));
  const baseX = (index - (count - 1) / 2) * spread;

  const u1 = r();
  const u2 = r();
  const u3 = r();
  const u4 = r();
  const u5 = r();
  const u6 = r();

  let x = baseX + (u1 - 0.5) * 0.5;
  let y = 2.45 + u2 * 0.9;
  let z = (u3 - 0.5) * 0.85;
  let vx = (u1 - 0.5) * 3.4 + (baseX >= 0 ? -0.55 : 0.55);
  let vy = 1.4 + u2 * 2.6;
  let vz = (u3 - 0.5) * 3.0;

  const spinAxis = new THREE.Vector3(u4 * 2 - 1, 0.4 + u5, u6 * 2 - 1).normalize();
  let spinSpeed = 15 + u4 * 11 + index * 0.75;
  let angle = u5 * Math.PI * 2;
  const tumbleQ = new THREE.Quaternion();
  const blended = new THREE.Quaternion();

  const durationSec = DICE_PHYSICS_DURATION_MS / 1000;
  const dt = durationSec / SIM_STEPS;
  const frames: DieKeyframe[] = [];

  for (let i = 0; i <= SIM_STEPS; i++) {
    const t = i / SIM_STEPS;

    if (i > 0) {
      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;
      angle += spinSpeed * dt;
      tumbleQ.setFromAxisAngle(spinAxis, angle);

      if (y < TABLE_Y + half) {
        y = TABLE_Y + half;
        if (vy < 0) {
          vy = -vy * RESTITUTION;
          vx *= FRICTION;
          vz *= FRICTION;
          spinSpeed *= SPIN_DAMP;
          vx += (r() - 0.5) * 1.1;
          vz += (r() - 0.5) * 1.1;
          // leichte Achsen-Änderung nach Bounce
          spinAxis.x += (r() - 0.5) * 0.35;
          spinAxis.z += (r() - 0.5) * 0.35;
          spinAxis.normalize();
        }
        if (Math.abs(vy) < 0.6 && t > 0.32) {
          vy = 0;
          y = TABLE_Y + half;
          vx *= 0.9;
          vz *= 0.9;
          spinSpeed *= 0.88;
        }
      }

      const bound = 2.55;
      if (Math.abs(x) > bound) {
        x = Math.sign(x) * bound;
        vx *= -0.4;
      }
      if (Math.abs(z) > bound) {
        z = Math.sign(z) * bound;
        vz *= -0.4;
      }
    } else {
      tumbleQ.setFromAxisAngle(spinAxis, angle);
    }

    const settle = smoothstep(DICE_SETTLE_START, 0.94, t);
    const settleEase = easeOutCubic(settle);
    blended.copy(tumbleQ).slerp(targetQ, settleEase);

    const restY = TABLE_Y + half;
    const restX = baseX + (u1 - 0.5) * 0.12;
    const restZ = (u3 - 0.5) * 0.18;
    const px = THREE.MathUtils.lerp(x, restX, settleEase);
    const py = THREE.MathUtils.lerp(Math.max(y, restY), restY, settleEase);
    const pz = THREE.MathUtils.lerp(z, restZ, settleEase);

    frames.push({
      t,
      x: px,
      y: py,
      z: pz,
      qx: blended.x,
      qy: blended.y,
      qz: blended.z,
      qw: blended.w,
    });
  }

  // Garantiert exakte Ziel-Orientierung am Ende
  const last = frames[frames.length - 1]!;
  last.qx = targetQ.x;
  last.qy = targetQ.y;
  last.qz = targetQ.z;
  last.qw = targetQ.w;
  last.y = TABLE_Y + half;

  return frames;
}

export function sampleTrajectory(
  frames: DieKeyframe[],
  t: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion,
): boolean {
  const clamped = Math.min(1, Math.max(0, t));
  if (frames.length === 0) {
    outPos.set(0, 0.6, 0);
    outQuat.identity();
    return true;
  }
  if (clamped >= 1) {
    const f = frames[frames.length - 1]!;
    outPos.set(f.x, f.y, f.z);
    outQuat.set(f.qx, f.qy, f.qz, f.qw);
    return true;
  }

  let i = 0;
  while (i < frames.length - 1 && frames[i + 1]!.t < clamped) i++;
  const a = frames[i]!;
  const b = frames[Math.min(frames.length - 1, i + 1)]!;
  const span = Math.max(1e-6, b.t - a.t);
  const u = (clamped - a.t) / span;

  outPos.set(
    THREE.MathUtils.lerp(a.x, b.x, u),
    THREE.MathUtils.lerp(a.y, b.y, u),
    THREE.MathUtils.lerp(a.z, b.z, u),
  );
  // Slerp ohne Zwischen-Allokation: temporär in outQuat laden, dann slerpen
  const ax = a.qx;
  const ay = a.qy;
  const az = a.qz;
  const aw = a.qw;
  outQuat.set(ax, ay, az, aw);
  const qb = _tmpQuat.set(b.qx, b.qy, b.qz, b.qw);
  outQuat.slerp(qb, u);
  return clamped >= 0.98;
}
