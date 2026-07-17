import * as THREE from "three";
import { createSeededRng } from "@/src/lib/session/dice-roll";
import {
  dieScale,
  faceValueMostAligned,
  quaternionForFaceUp,
} from "@/src/lib/session/dice-3d-math";
import { slingshotSpeedFromStrength } from "@/src/lib/session/dice-slingshot";

/** Safety-Cap für Sim + Playback (kein fester Taktgeber für Roll-Dauer). */
export const DICE_PHYSICS_MAX_MS = 5000;
/** Mindest-Playback — auch bei sehr schwachem Wurf. */
export const DICE_PHYSICS_MIN_MS = 550;
/** @deprecated Nur noch Safety/Fallback-Alias — echte Dauer kommt aus der Trajektorie. */
export const DICE_PHYSICS_DURATION_MS = DICE_PHYSICS_MAX_MS;

const TABLE_Y = 0;
/**
 * Pro-Frame Velocity-Damping (XZ).
 * 0.928 war zu aggressiv (Travel starb ~t=0.26 → Spin in place).
 * 0.978 war zu „eisig“. Mittelweg behält Travel + Roll-Kopplung.
 */
const PLANE_FRICTION = 0.958;
const WALL_RESTITUTION = 0.34;
const COLLISION_RESTITUTION = 0.4;
/** Baumgarte: nur Teil der Penetration korrigieren → kein Oscillation. */
const BAUMGARTE = 0.22;
const PENETRATION_SLOP = 0.01;
/** Sleep erst bei wirklich langsamer Bewegung — sonst friert Travel zu früh ein. */
const SLEEP_SPEED = 0.15;
/** Festes Sim-Δt (s) — Dauer entsteht aus Reibung + Slingshot-Impuls. */
const SIM_DT = 1 / 120;
const MAX_SIM_SEC = DICE_PHYSICS_MAX_MS / 1000;
/** Weiche Positions-Feinplatzierung nach Sleep aller Würfel. */
const SETTLE_LERP_SEC = 0.32;
const SLEEP_FRAMES_REQUIRED = 3;
const BOUND = 3.5;
/** Roll-Radius-Faktor: ω ≈ v / (radius × ROLL_RADIUS_FACTOR). */
const ROLL_RADIUS_FACTOR = 0.72;
/**
 * Mindestabstand-Faktor (Zentrum–Zentrum = (r_a+r_b) × scale).
 * >1 → klarer Gap über dem Durchmesser, Faces von oben lesbar.
 */
const LIVE_SEPARATION_SCALE = 1.32;
const REST_SEPARATION_SCALE = 1.5;
/** Ab t≥0.65: progressive Slerp von Physik-Tumble → targetQ (letzte 35 %). */
const BLEND_START_T = 0.65;
const _tmpQuat = new THREE.Quaternion();
const _gravQuat = new THREE.Quaternion();
const _outQuat = new THREE.Quaternion();
const _nearestQ = new THREE.Quaternion();

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
  sides: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  half: number;
  /** Effektiver Roll-Radius für ω ≈ v/r. */
  rollRadius: number;
  /** Achse senkrecht zur Bewegungsrichtung (Rollen ohne Rutschen). */
  rollAxis: THREE.Vector3;
  /** Pfad-integrierter Roll-Winkel (gekoppelt an Translation). */
  rollAngle: number;
  spinAxis: THREE.Vector3;
  /** Rest-Tumble (rad) für Face-Landing; Ease → 0 endet exakt auf targetQ. */
  angle0: number;
  /** Extra-Tumble durch Kollisionen (dämpft separat). */
  bumpAngle: number;
  /** Letzte Sim-Geschwindigkeit (für Spin-on-the-spot-Unterdrückung). */
  lastSpeed: number;
  tumbleQ: THREE.Quaternion;
  rollQ: THREE.Quaternion;
  targetQ: THREE.Quaternion;
  resting: boolean;
  /** Aufeinanderfolgende Frames unter SLEEP_SPEED. */
  sleepFrames: number;
  restX: number;
  restZ: number;
  frames: DieKeyframe[];
  rng: () => number;
};

export type DiceTrajectoriesResult = {
  trajectories: DieKeyframe[][];
  durationMs: number;
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

/**
 * Roll-Achse: n × v (Y-up). Fast horizontal → Tisch-Bezug / kein „Schweben“.
 */
function rollAxisFromVelocity(
  vx: number,
  vz: number,
  out: THREE.Vector3,
): boolean {
  const len = Math.hypot(vx, vz);
  if (len < 1e-4) return false;
  out.set(vz / len, 0.03, -vx / len).normalize();
  return true;
}

function clampToBounds(d: DieSim): void {
  const lim = BOUND - d.radius;
  d.x = THREE.MathUtils.clamp(d.x, -lim, lim);
  d.z = THREE.MathUtils.clamp(d.z, -lim, lim);
}

/**
 * Nächste stabile Face-up-Orientierung (Schwerpunkt / Face-Gravity).
 */
function nearestStableFaceUp(sides: number, q: THREE.Quaternion): THREE.Quaternion {
  const face = faceValueMostAligned(sides, q);
  return _nearestQ.copy(quaternionForFaceUp(sides, face));
}

/**
 * Orientierung: Roll (gekoppelt an v) × Rest-Tumble × targetQ,
 * plus Face-Gravity zur nächsten flachen Fläche; klingt mit v≈0 aus (kein Ghost-Tumble).
 */
function writeOrientation(d: DieSim): {
  qx: number;
  qy: number;
  qz: number;
  qw: number;
} {
  const rollTarget = Math.max(d.angle0, 1e-6);
  const rollProgress = Math.min(1, d.rollAngle / rollTarget);
  const plannedResidual = d.angle0 * (1 - easeOutCubic(rollProgress));

  const moveWeight = smoothstep(SLEEP_SPEED * 0.4, SLEEP_SPEED * 3.2, d.lastSpeed);
  const residualScale = d.resting ? 0 : moveWeight;
  const bumpFade = (1 - rollProgress) * (d.resting ? 0 : moveWeight);

  const tumbleAng = plannedResidual * residualScale + d.bumpAngle * bumpFade;

  const rollFade = d.resting
    ? 0
    : d.lastSpeed > SLEEP_SPEED
      ? 1
      : smoothstep(SLEEP_SPEED * 0.15, SLEEP_SPEED, d.lastSpeed);
  const rollAng = d.rollAngle * rollFade;

  _outQuat.copy(d.targetQ);
  if (tumbleAng > 1e-5) {
    d.tumbleQ.setFromAxisAngle(d.spinAxis, tumbleAng);
    _outQuat.premultiply(d.tumbleQ);
  }
  if (rollAng > 1e-5) {
    d.rollQ.setFromAxisAngle(d.rollAxis, rollAng);
    _outQuat.premultiply(d.rollQ);
  }

  // Face-Gravity: Schwerpunkt zieht zur nächsten stabilen Face (stärker bei langsamer Bewegung)
  const gravFromSpeed = 1 - smoothstep(SLEEP_SPEED * 0.6, SLEEP_SPEED * 4.5, d.lastSpeed);
  const gravFromRoll = smoothstep(0.08, 0.72, rollProgress);
  const gravW =
    gravFromSpeed * gravFromRoll * (1 - smoothstep(0.88, 1, rollProgress));
  if (gravW > 0.02) {
    const stable = nearestStableFaceUp(d.sides, _outQuat);
    _gravQuat.copy(_outQuat).slerp(stable, Math.min(0.72, gravW * 0.85));
    _outQuat.copy(_gravQuat);
  }

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
 * Orientierung: Roll × Face-Gravity × Server-Face — endet ohne späte Korrektur.
 */
export function buildDiceTrajectories(opts: {
  sides: number;
  faces: number[];
  seed: string;
  aimX?: number;
  aimZ?: number;
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
}): DiceTrajectoriesResult {
  const { sides, faces, seed } = opts;
  const count = faces.length;
  if (count === 0) {
    return { trajectories: [], durationMs: DICE_PHYSICS_MIN_MS };
  }

  const aimX = Number.isFinite(opts.aimX) ? (opts.aimX as number) : 0;
  const aimZ = Number.isFinite(opts.aimZ) ? (opts.aimZ as number) : 0;
  const throwStrength =
    typeof opts.throwStrength === "number" && Number.isFinite(opts.throwStrength)
      ? Math.min(1, Math.max(0, opts.throwStrength))
      : undefined;
  const isTap = opts.isTap === true;
  const hasSlingshotDir =
    !isTap &&
    typeof opts.throwDirX === "number" &&
    typeof opts.throwDirZ === "number" &&
    Number.isFinite(opts.throwDirX) &&
    Number.isFinite(opts.throwDirZ) &&
    Math.hypot(opts.throwDirX, opts.throwDirZ) > 1e-4;

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
    let dirX = Math.cos(dirAngle);
    let dirZ = Math.sin(dirAngle);

    if (hasSlingshotDir) {
      const len = Math.hypot(opts.throwDirX!, opts.throwDirZ!);
      dirX = opts.throwDirX! / len;
      dirZ = opts.throwDirZ! / len;
    }

    // Breiterer Spawn-Spread → weniger Start-Überlappung bei Multi-Dice
    const perpX = -dirZ;
    const perpZ = dirX;
    const spawnSpread = Math.max(
      radius * 2.55,
      Math.min(0.85, 1.35 / Math.max(1, count)),
    );
    const spawnSide = (index - (count - 1) / 2) * spawnSpread;

    const x = aimX + dirX * 0.04 + perpX * spawnSide;
    const z = aimZ + dirZ * 0.04 + perpZ * spawnSide;

    const useSlingshotImpulse = hasSlingshotDir || isTap || throwStrength !== undefined;
    const speed = useSlingshotImpulse
      ? slingshotSpeedFromStrength(throwStrength, isTap, u3 - 0.5) +
        (count > 1 ? 0.18 * index : 0)
      : 2.55 + u3 * 2.85 + (count > 1 ? 0.18 * index : 0);
    const vx = dirX * speed + (u4 - 0.5) * 0.7;
    const vz = dirZ * speed + (u5 - 0.5) * 0.7;

    const rollRadius = radius * ROLL_RADIUS_FACTOR;
    const rollAxis = new THREE.Vector3();
    rollAxisFromVelocity(vx, vz, rollAxis);

    // Rest-Tumble-Achse: weitgehend horizontal (Tisch-Bezug)
    const spinAxis = new THREE.Vector3(
      u4 * 2 - 1,
      0.05 + u2 * 0.1,
      u6 * 2 - 1,
    ).normalize();

    // Rest-Tumble — Hauptrotation vom Roll-Integral (ω ≈ v/r)
    const turns = 0.85 + u7 * 1.15 + index * 0.07;
    const angle0 = turns * Math.PI * 2;

    return {
      sides,
      x,
      z,
      vx,
      vz,
      radius,
      half,
      rollRadius,
      rollAxis,
      rollAngle: 0,
      spinAxis,
      angle0,
      bumpAngle: 0,
      lastSpeed: speed,
      tumbleQ: new THREE.Quaternion(),
      rollQ: new THREE.Quaternion(),
      targetQ,
      resting: false,
      sleepFrames: 0,
      restX: x,
      restZ: z,
      frames: [],
      rng: r,
    };
  });

  softSeparate(dice, 16, LIVE_SEPARATION_SCALE);

  const collRng = createSeededRng(`${seed}:coll`);
  const dt = SIM_DT;

  const pushFrame = (elapsedSec: number, pxFn: (d: DieSim) => number, pzFn: (d: DieSim) => number) => {
    for (const d of dice) {
      const { qx, qy, qz, qw } = writeOrientation(d);
      d.frames.push({
        t: elapsedSec,
        x: pxFn(d),
        y: TABLE_Y + d.half,
        z: pzFn(d),
        qx,
        qy,
        qz,
        qw,
      });
    }
  };

  pushFrame(0, (d) => d.x, (d) => d.z);

  let elapsed = 0;
  while (elapsed < MAX_SIM_SEC) {
    elapsed += dt;

    for (const d of dice) {
      if (d.resting) {
        d.vx = 0;
        d.vz = 0;
        d.lastSpeed = 0;
        d.bumpAngle *= 0.9;
        d.x = d.restX;
        d.z = d.restZ;
        continue;
      }

      d.vx *= PLANE_FRICTION;
      d.vz *= PLANE_FRICTION;
      d.bumpAngle *= 0.97;

      const spd = speedOf(d);
      d.lastSpeed = spd;

      if (spd > 1e-4) {
        rollAxisFromVelocity(d.vx, d.vz, d.rollAxis);
        d.rollAngle += (spd * dt) / d.rollRadius;
      }

      d.x += d.vx * dt;
      d.z += d.vz * dt;

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

      if (spd < SLEEP_SPEED) {
        d.sleepFrames += 1;
        if (d.sleepFrames >= SLEEP_FRAMES_REQUIRED) {
          d.resting = true;
          d.vx = 0;
          d.vz = 0;
          d.lastSpeed = 0;
        }
      } else {
        d.sleepFrames = 0;
      }

      d.restX = d.x;
      d.restZ = d.z;
    }

    resolveCollisionsSoft(dice, collRng, dt);
    softSeparate(dice, 3, LIVE_SEPARATION_SCALE);
    for (const d of dice) {
      if (d.resting) {
        d.restX = d.x;
        d.restZ = d.z;
      }
    }

    pushFrame(elapsed, (d) => d.x, (d) => d.z);

    if (dice.every((d) => d.resting)) break;
  }

  for (const d of dice) {
    d.resting = true;
    d.vx = 0;
    d.vz = 0;
    d.lastSpeed = 0;
    d.restX = d.x;
    d.restZ = d.z;
  }

  const preSettleX = dice.map((d) => d.x);
  const preSettleZ = dice.map((d) => d.z);
  softSeparateRest(dice, 28, REST_SEPARATION_SCALE);

  const physicsEnd = elapsed;
  const settleSteps = Math.max(1, Math.ceil(SETTLE_LERP_SEC / dt));
  for (let i = 1; i <= settleSteps; i++) {
    const settleU = easeInOutCubic(i / settleSteps);
    const tNow = physicsEnd + i * dt;
    for (let di = 0; di < dice.length; di++) {
      const d = dice[di]!;
      const { qx, qy, qz, qw } = writeOrientation(d);
      d.frames.push({
        t: tNow,
        x: THREE.MathUtils.lerp(preSettleX[di]!, d.restX, settleU),
        y: TABLE_Y + d.half,
        z: THREE.MathUtils.lerp(preSettleZ[di]!, d.restZ, settleU),
        qx,
        qy,
        qz,
        qw,
      });
    }
  }

  const totalSec = physicsEnd + SETTLE_LERP_SEC;
  const safeTotalSec = Math.max(1e-6, totalSec);
  const blendDuration = 1 - BLEND_START_T;
  const durationMs = Math.min(
    DICE_PHYSICS_MAX_MS,
    Math.max(DICE_PHYSICS_MIN_MS, Math.round(safeTotalSec * 1000)),
  );

  for (const d of dice) {
    for (const f of d.frames) {
      f.t = f.t / safeTotalSec;
    }
    for (const f of d.frames) {
      if (f.t < BLEND_START_T) continue;
      const blendAlpha = Math.min(1, (f.t - BLEND_START_T) / blendDuration);
      const eased = easeOutCubic(blendAlpha);
      _tmpQuat.set(f.qx, f.qy, f.qz, f.qw);
      _outQuat.copy(_tmpQuat).slerp(d.targetQ, eased);
      f.qx = _outQuat.x;
      f.qy = _outQuat.y;
      f.qz = _outQuat.z;
      f.qw = _outQuat.w;
    }
    const last = d.frames[d.frames.length - 1]!;
    last.t = 1;
    last.qx = d.targetQ.x;
    last.qy = d.targetQ.y;
    last.qz = d.targetQ.z;
    last.qw = d.targetQ.w;
    last.x = d.restX;
    last.y = TABLE_Y + d.half;
    last.z = d.restZ;
  }

  return { trajectories: dice.map((d) => d.frames), durationMs };
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
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
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
    throwDirX: opts.throwDirX,
    throwDirZ: opts.throwDirZ,
    throwStrength: opts.throwStrength,
    isTap: opts.isTap,
  });
  return all.trajectories[opts.index] ?? all.trajectories[0] ?? [];
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
        const overlap = (minDist - dist) * 0.5 * BAUMGARTE * 2.4;
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
        const overlap = (minDist - dist) * 0.5 * 0.72;
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
      const minDist = (da.radius + db.radius) * LIVE_SEPARATION_SCALE;

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
      const tumbleBoost = 0.1 + collRng() * 0.22;
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
