import * as THREE from "three";
import { createSeededRng } from "@/src/lib/session/dice-roll";
import { dieScale, quaternionForFaceUp } from "@/src/lib/session/dice-3d-math";

export const DICE_PHYSICS_DURATION_MS = 3000;
/** Ab hier: nur Positions-Feinplatzierung (Orientierung endet bereits korrekt). */
export const DICE_SETTLE_START = 0.84;

const TABLE_Y = 0;
/** Pro-Frame Velocity-Damping (XZ). */
const PLANE_FRICTION = 0.978;
const WALL_RESTITUTION = 0.38;
const COLLISION_RESTITUTION = 0.42;
/** Baumgarte: nur Teil der Penetration korrigieren → kein Oscillation. */
const BAUMGARTE = 0.18;
const PENETRATION_SLOP = 0.012;
const SLEEP_SPEED = 0.12;
const SIM_STEPS = 150;
const BOUND = 3.5;
/** Geplanter Tumble ist bis hier auf 0 (weiches Ausrollen). */
const TUMBLE_END_T = 0.94;
const _tmpQuat = new THREE.Quaternion();
const _outQuat = new THREE.Quaternion();

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

type DieSim = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  half: number;
  spinAxis: THREE.Vector3;
  /** Start-Tumble (rad); Ease → 0 endet exakt auf targetQ. */
  angle0: number;
  /** Extra-Tumble durch Kollisionen (dämpft separat). */
  bumpAngle: number;
  tumbleQ: THREE.Quaternion;
  targetQ: THREE.Quaternion;
  resting: boolean;
  restX: number;
  restZ: number;
  frames: DieKeyframe[];
  rng: () => number;
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Ease-out: schneller Start, weiches Landen (kein Turbo am Ende). */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return u * u * (3 - 2 * u);
}

function collisionRadius(sides: number): number {
  return 0.5 * dieScale(sides);
}

function speedOf(d: DieSim): number {
  return Math.hypot(d.vx, d.vz);
}

function clampToBounds(d: DieSim): void {
  const lim = BOUND - d.radius;
  d.x = THREE.MathUtils.clamp(d.x, -lim, lim);
  d.z = THREE.MathUtils.clamp(d.z, -lim, lim);
}

/**
 * Sichtbarer Tumble: von Anfang an auf 0 geplant + kleine Kollisions-Bumps.
 * Bei t≥TUMBLE_END_T → Orientierung exakt targetQ (kein Slerp-Snap).
 */
function displayAngle(d: DieSim, t: number): number {
  const u = smoothstep(0, TUMBLE_END_T, t);
  const planned = d.angle0 * (1 - easeOutCubic(u));
  const bumpFade = 1 - smoothstep(0.45, TUMBLE_END_T, t);
  return planned + d.bumpAngle * bumpFade;
}

function writeOrientation(d: DieSim, t: number): {
  qx: number;
  qy: number;
  qz: number;
  qw: number;
} {
  const ang = displayAngle(d, t);
  if (ang < 1e-5) {
    return {
      qx: d.targetQ.x,
      qy: d.targetQ.y,
      qz: d.targetQ.z,
      qw: d.targetQ.w,
    };
  }
  d.tumbleQ.setFromAxisAngle(d.spinAxis, ang);
  _outQuat.copy(d.tumbleQ).multiply(d.targetQ);
  return {
    qx: _outQuat.x,
    qy: _outQuat.y,
    qz: _outQuat.z,
    qw: _outQuat.w,
  };
}

/**
 * Deterministische 2D-Trajektorien (XZ) mit weicher Kollision.
 * Seeded Sync; Endlagen mit Mindestabstand.
 * Orientierung: geplanter Tumble × Server-Face — endet ohne späte Korrektur.
 */
export function buildDiceTrajectories(opts: {
  sides: number;
  faces: number[];
  seed: string;
  aimX?: number;
  aimZ?: number;
}): DieKeyframe[][] {
  const { sides, faces, seed } = opts;
  const count = faces.length;
  if (count === 0) return [];

  const aimX = Number.isFinite(opts.aimX) ? (opts.aimX as number) : 0;
  const aimZ = Number.isFinite(opts.aimZ) ? (opts.aimZ as number) : 0;

  const dice: DieSim[] = faces.map((face, index) => {
    const rng = createSeededRng(`${seed}:traj:${index}`);
    const r = () => rng();
    const scale = dieScale(sides);
    const half = 0.5 * scale;
    const radius = collisionRadius(sides);
    const targetQ = quaternionForFaceUp(sides, face);

    const u1 = r();
    const u2 = r();
    const u3 = r();
    const u4 = r();
    const u5 = r();
    const u6 = r();
    const u7 = r();
    void r(); // u8 — RNG-Stream stabil halten

    const dirAngle = u1 * Math.PI * 2;
    const dirX = Math.cos(dirAngle);
    const dirZ = Math.sin(dirAngle);
    const spawnSpread = Math.max(
      radius * 2.15,
      Math.min(0.58, 1.05 / Math.max(1, count)),
    );
    const spawnSide = (index - (count - 1) / 2) * spawnSpread;

    const x =
      aimX + dirX * 0.04 + Math.cos(dirAngle + Math.PI / 2) * spawnSide;
    const z =
      aimZ + dirZ * 0.04 + Math.sin(dirAngle + Math.PI / 2) * spawnSide;

    const speed = 3.4 + u3 * 3.8 + (count > 1 ? 0.22 * index : 0);
    const vx = dirX * speed + (u4 - 0.5) * 0.9;
    const vz = dirZ * speed + (u5 - 0.5) * 0.9;

    // Spin-Achse weitgehend horizontal → sichtbares Drehen von oben
    const spinAxis = new THREE.Vector3(
      u4 * 2 - 1,
      0.15 + u2 * 0.25,
      u6 * 2 - 1,
    ).normalize();

    // Mehrere volle Umdrehungen, Ease-out auf 0 → landet auf targetQ
    const turns = 2.6 + u7 * 2.4 + index * 0.12;
    const angle0 = turns * Math.PI * 2;

    return {
      x,
      z,
      vx,
      vz,
      radius,
      half,
      spinAxis,
      angle0,
      bumpAngle: 0,
      tumbleQ: new THREE.Quaternion().setFromAxisAngle(spinAxis, angle0),
      targetQ,
      resting: false,
      restX: x,
      restZ: z,
      frames: [],
      rng: r,
    };
  });

  softSeparate(dice, 12, 1.0);

  const durationSec = DICE_PHYSICS_DURATION_MS / 1000;
  const dt = durationSec / SIM_STEPS;
  const collRng = createSeededRng(`${seed}:coll`);
  let settleCaptured = false;

  for (let i = 0; i <= SIM_STEPS; i++) {
    const t = i / SIM_STEPS;

    if (i > 0) {
      // Zeitabhängiges Extra-Damping → weiches Ausrollen (Position)
      const timeDamp = 1 - smoothstep(0.35, 0.78, t) * 0.045;

      for (const d of dice) {
        if (d.resting) {
          d.vx = 0;
          d.vz = 0;
          d.bumpAngle *= 0.92;
          d.x = d.restX;
          d.z = d.restZ;
          continue;
        }

        d.vx *= PLANE_FRICTION * timeDamp;
        d.vz *= PLANE_FRICTION * timeDamp;
        d.bumpAngle *= 0.975;

        d.x += d.vx * dt;
        d.z += d.vz * dt;

        // Weiche Wand-Kollision
        const lim = BOUND - d.radius;
        if (d.x > lim) {
          d.x = lim;
          if (d.vx > 0) d.vx *= -WALL_RESTITUTION;
        } else if (d.x < -lim) {
          d.x = -lim;
          if (d.vx < 0) d.vx *= -WALL_RESTITUTION;
        }
        if (d.z > lim) {
          d.z = lim;
          if (d.vz > 0) d.vz *= -WALL_RESTITUTION;
        } else if (d.z < -lim) {
          d.z = -lim;
          if (d.vz < 0) d.vz *= -WALL_RESTITUTION;
        }

        if (speedOf(d) < SLEEP_SPEED && t > 0.5) {
          d.resting = true;
          d.vx = 0;
          d.vz = 0;
          d.restX = d.x;
          d.restZ = d.z;
        } else {
          d.restX = d.x;
          d.restZ = d.z;
        }
      }

      resolveCollisionsSoft(dice, collRng, dt);
    }

    // Settle: nur Position trennen — Orientierung folgt geplanter Ease-Kurve
    if (!settleCaptured && t >= DICE_SETTLE_START) {
      for (const d of dice) {
        d.resting = true;
        d.vx = 0;
        d.vz = 0;
        d.restX = d.x;
        d.restZ = d.z;
      }
      softSeparateRest(dice, 20, 1.06);
      settleCaptured = true;
    }

    const settleU = settleCaptured
      ? easeInOutCubic(smoothstep(DICE_SETTLE_START, 0.98, t))
      : 0;

    for (const d of dice) {
      const { qx, qy, qz, qw } = writeOrientation(d, t);

      const px = settleCaptured
        ? THREE.MathUtils.lerp(d.x, d.restX, settleU)
        : d.x;
      const pz = settleCaptured
        ? THREE.MathUtils.lerp(d.z, d.restZ, settleU)
        : d.z;

      d.frames.push({
        t,
        x: px,
        y: TABLE_Y + d.half,
        z: pz,
        qx,
        qy,
        qz,
        qw,
      });
    }
  }

  // Finale Keyframes: exakte Ziel-Orientierung + Rest-Position
  for (const d of dice) {
    const last = d.frames[d.frames.length - 1]!;
    last.qx = d.targetQ.x;
    last.qy = d.targetQ.y;
    last.qz = d.targetQ.z;
    last.qw = d.targetQ.w;
    last.x = d.restX;
    last.y = TABLE_Y + d.half;
    last.z = d.restZ;
  }

  return dice.map((d) => d.frames);
}

/** Einzelwürfel-Kompatibilität. */
export function buildDieTrajectory(opts: {
  sides: number;
  face: number;
  seed: string;
  index: number;
  count: number;
  aimX?: number;
  aimZ?: number;
}): DieKeyframe[] {
  const faces = Array.from({ length: Math.max(1, opts.count) }, (_, i) =>
    i === opts.index ? opts.face : 1,
  );
  const all = buildDiceTrajectories({
    sides: opts.sides,
    faces,
    seed: opts.seed,
    aimX: opts.aimX,
    aimZ: opts.aimZ,
  });
  return all[opts.index] ?? all[0] ?? [];
}

/** Weiche Positionstrennung (kein harter Snap). */
function softSeparate(dice: DieSim[], iterations: number, scale: number): void {
  for (let n = 0; n < iterations; n++) {
    for (let a = 0; a < dice.length; a++) {
      for (let b = a + 1; b < dice.length; b++) {
        const da = dice[a]!;
        const db = dice[b]!;
        const dx = db.x - da.x;
        const dz = db.z - da.z;
        let dist = Math.hypot(dx, dz);
        const minDist = (da.radius + db.radius) * scale;
        if (dist < 1e-6) {
          const ang = (a * 2.399 + b * 1.7) % (Math.PI * 2);
          const push = minDist * 0.5;
          da.x -= Math.cos(ang) * push;
          da.z -= Math.sin(ang) * push;
          db.x += Math.cos(ang) * push;
          db.z += Math.sin(ang) * push;
          continue;
        }
        if (dist >= minDist) continue;
        const overlap = (minDist - dist) * 0.5 * BAUMGARTE * 2.2;
        const nx = dx / dist;
        const nz = dz / dist;
        da.x -= nx * overlap;
        da.z -= nz * overlap;
        db.x += nx * overlap;
        db.z += nz * overlap;
      }
    }
  }
  for (const d of dice) {
    clampToBounds(d);
    d.restX = d.x;
    d.restZ = d.z;
  }
}

function softSeparateRest(
  dice: DieSim[],
  iterations: number,
  scale: number,
): void {
  for (let n = 0; n < iterations; n++) {
    for (let a = 0; a < dice.length; a++) {
      for (let b = a + 1; b < dice.length; b++) {
        const da = dice[a]!;
        const db = dice[b]!;
        const dx = db.restX - da.restX;
        const dz = db.restZ - da.restZ;
        let dist = Math.hypot(dx, dz);
        const minDist = (da.radius + db.radius) * scale;
        if (dist < 1e-6) {
          const ang = (a * 2.399 + b * 1.7) % (Math.PI * 2);
          const push = minDist * 0.5;
          da.restX -= Math.cos(ang) * push;
          da.restZ -= Math.sin(ang) * push;
          db.restX += Math.cos(ang) * push;
          db.restZ += Math.sin(ang) * push;
          continue;
        }
        if (dist >= minDist) continue;
        const overlap = (minDist - dist) * 0.5 * 0.55;
        const nx = dx / dist;
        const nz = dz / dist;
        da.restX -= nx * overlap;
        da.restZ -= nz * overlap;
        db.restX += nx * overlap;
        db.restZ += nz * overlap;
      }
    }
  }
  for (const d of dice) {
    const lim = BOUND - d.radius;
    d.restX = THREE.MathUtils.clamp(d.restX, -lim, lim);
    d.restZ = THREE.MathUtils.clamp(d.restZ, -lim, lim);
    d.x = d.restX;
    d.z = d.restZ;
  }
}

/**
 * Kreis-Kollision: Impuls nur bei Annäherung + weiche Baumgarte-Korrektur.
 * Keine Spin-Axis-Randomisierung → kein visueller Jitter.
 */
function resolveCollisionsSoft(
  dice: DieSim[],
  collRng: () => number,
  dt: number,
): void {
  for (let a = 0; a < dice.length; a++) {
    for (let b = a + 1; b < dice.length; b++) {
      const da = dice[a]!;
      const db = dice[b]!;
      if (da.resting && db.resting) continue;

      const dx = db.x - da.x;
      const dz = db.z - da.z;
      let dist = Math.hypot(dx, dz);
      const minDist = da.radius + db.radius;

      if (dist < 1e-6) {
        const ang = collRng() * Math.PI * 2;
        const nx = Math.cos(ang);
        const nz = Math.sin(ang);
        const push = minDist * 0.5;
        da.x -= nx * push;
        da.z -= nz * push;
        db.x += nx * push;
        db.z += nz * push;
        dist = minDist;
        continue;
      }

      const penetration = minDist - dist;
      if (penetration <= PENETRATION_SLOP) continue;

      const nx = dx / dist;
      const nz = dz / dist;

      // Baumgarte positional correction (anteilmäßig, gedämpft)
      const corr = Math.max(0, penetration - PENETRATION_SLOP) * BAUMGARTE;
      if (!da.resting && !db.resting) {
        const half = corr * 0.5;
        da.x -= nx * half;
        da.z -= nz * half;
        db.x += nx * half;
        db.z += nz * half;
      } else if (!da.resting) {
        da.x -= nx * corr;
        da.z -= nz * corr;
      } else if (!db.resting) {
        db.x += nx * corr;
        db.z += nz * corr;
      }

      const rvx = db.vx - da.vx;
      const rvz = db.vz - da.vz;
      const velAlong = rvx * nx + rvz * nz;
      if (velAlong >= 0) continue;

      const restitution =
        COLLISION_RESTITUTION * (0.92 + collRng() * 0.12);
      // Masse = 1: Impuls / 2
      const j = (-(1 + restitution) * velAlong) / 2;
      // Zusätzlich leicht dämpfen proportional zu dt (Stabilität)
      const dampJ = j * (1 - Math.min(0.15, dt * 2));

      if (!da.resting) {
        da.vx -= dampJ * nx;
        da.vz -= dampJ * nz;
      }
      if (!db.resting) {
        db.vx += dampJ * nx;
        db.vz += dampJ * nz;
      }

      // Sanfter Extra-Tumble auf derselben Achse (kein Achsen-Zucken)
      const tumbleBoost = 0.2 + collRng() * 0.45;
      if (!da.resting) da.bumpAngle += tumbleBoost;
      if (!db.resting) db.bumpAngle += tumbleBoost;
    }
  }
}

/** t∈[0,1] → Position/Quat. `true` erst bei t≥1. */
export function sampleTrajectory(
  frames: DieKeyframe[],
  t: number,
  outPos: THREE.Vector3,
  outQuat: THREE.Quaternion,
): boolean {
  const clamped = Math.min(1, Math.max(0, t));
  if (frames.length === 0) {
    outPos.set(0, 0.5, 0);
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
  outQuat.set(a.qx, a.qy, a.qz, a.qw);
  const qb = _tmpQuat.set(b.qx, b.qy, b.qz, b.qw);
  outQuat.slerp(qb, u);
  return false;
}
