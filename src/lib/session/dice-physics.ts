import * as THREE from "three";
import { createSeededRng } from "@/src/lib/session/dice-roll";
import { dieScale, quaternionForFaceUp } from "@/src/lib/session/dice-3d-math";

export const DICE_PHYSICS_DURATION_MS = 2800;
export const DICE_SETTLE_START = 0.62;

const TABLE_Y = 0;
const GRAVITY = -36;
const RESTITUTION = 0.42;
const FRICTION = 0.72;
const SPIN_DAMP = 0.82;
const SIM_STEPS = 112;
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
 * Deterministische Bounce-/Roll-Trajektorie vom Cursor-Drop.
 * Horizontale Richtung + Spin sind seeded (seed + dieIndex) → Multiplayer-Sync.
 */
export function buildDieTrajectory(opts: {
  sides: number;
  face: number;
  seed: string;
  index: number;
  count: number;
  /** Welt-Ziel auf Tisch-Ebene (Cursor-Projektion). */
  aimX?: number;
  aimZ?: number;
}): DieKeyframe[] {
  const { sides, face, seed, index, count } = opts;
  const aimX = Number.isFinite(opts.aimX) ? (opts.aimX as number) : 0;
  const aimZ = Number.isFinite(opts.aimZ) ? (opts.aimZ as number) : 0;
  const rng = createSeededRng(`${seed}:traj:${index}`);
  const r = () => rng();

  const scale = dieScale(sides);
  const half = 0.55 * scale;
  const targetQ = quaternionForFaceUp(sides, face);

  const u1 = r();
  const u2 = r();
  const u3 = r();
  const u4 = r();
  const u5 = r();
  const u6 = r();
  const u7 = r();
  const u8 = r();

  // Beliebige horizontale Richtung (0…2π) — pro Die unterschiedlich dank seed:index
  const dirAngle = u1 * Math.PI * 2;
  const dirX = Math.cos(dirAngle);
  const dirZ = Math.sin(dirAngle);
  // Leichte seitliche Streuung am Spawn (nicht alle auf demselben Punkt)
  const spawnSpread = Math.max(0.12, Math.min(0.45, 0.85 / Math.max(1, count)));
  const spawnSide = (index - (count - 1) / 2) * spawnSpread;

  let x = aimX + dirX * 0.08 + Math.cos(dirAngle + Math.PI / 2) * spawnSide;
  let y = 3.15 + u2 * 0.9;
  let z = aimZ + dirZ * 0.08 + Math.sin(dirAngle + Math.PI / 2) * spawnSide;

  // Initial velocity: stark horizontal in Richtung + Abwärts-Schwung
  const horizSpeed = 3.6 + u3 * 4.8 + (count > 1 ? 0.35 * index : 0);
  let vx = dirX * horizSpeed + (u4 - 0.5) * 1.2;
  let vy = -4.5 - u2 * 5.5;
  let vz = dirZ * horizSpeed + (u5 - 0.5) * 1.2;

  // Angular velocity: tumble um zufällige Achse
  const spinAxis = new THREE.Vector3(
    u4 * 2 - 1,
    0.25 + u5 * 0.9,
    u6 * 2 - 1,
  ).normalize();
  let spinSpeed = 18 + u7 * 14 + index * 1.1;
  let angle = u8 * Math.PI * 2;
  const tumbleQ = new THREE.Quaternion();
  const blended = new THREE.Quaternion();

  const durationSec = DICE_PHYSICS_DURATION_MS / 1000;
  const dt = durationSec / SIM_STEPS;
  const frames: DieKeyframe[] = [];

  // Rest-Position ergibt sich aus der Simulation (letzter Bodenkontakt)
  let restX = x;
  let restZ = z;

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
          // Bounce-Kick leicht seitlich zur Rollrichtung (seeded)
          const kick = 0.55 + r() * 0.9;
          vx += dirX * kick * (r() - 0.15) + (r() - 0.5) * 0.8;
          vz += dirZ * kick * (r() - 0.15) + (r() - 0.5) * 0.8;
          spinAxis.x += (r() - 0.5) * 0.4;
          spinAxis.z += (r() - 0.5) * 0.4;
          spinAxis.normalize();
        }
        if (Math.abs(vy) < 0.55 && t > 0.28) {
          vy = 0;
          y = TABLE_Y + half;
          vx *= 0.88;
          vz *= 0.88;
          spinSpeed *= 0.86;
          restX = x;
          restZ = z;
        }
      }

      const bound = 3.6;
      if (Math.abs(x) > bound) {
        x = Math.sign(x) * bound;
        vx *= -0.45;
      }
      if (Math.abs(z) > bound) {
        z = Math.sign(z) * bound;
        vz *= -0.45;
      }

      if (y <= TABLE_Y + half + 0.02) {
        restX = x;
        restZ = z;
      }
    } else {
      tumbleQ.setFromAxisAngle(spinAxis, angle);
    }

    const settle = smoothstep(DICE_SETTLE_START, 0.96, t);
    const settleEase = easeOutCubic(settle);
    blended.copy(tumbleQ).slerp(targetQ, settleEase);

    const restY = TABLE_Y + half;
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
  last.x = restX;
  last.y = TABLE_Y + half;
  last.z = restZ;

  return frames;
}

/** t∈[0,1] → Position/Quat. `true` erst bei t≥1 (volle Animation). */
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
  const ax = a.qx;
  const ay = a.qy;
  const az = a.qz;
  const aw = a.qw;
  outQuat.set(ax, ay, az, aw);
  const qb = _tmpQuat.set(b.qx, b.qy, b.qz, b.qw);
  outQuat.slerp(qb, u);
  return false;
}
