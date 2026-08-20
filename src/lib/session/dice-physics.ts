import * as THREE from "three";
import { createSeededRng } from "@/src/lib/session/dice-roll";
import {
  diceReadingDirection,
  dieScale,
  faceNormal,
  faceValueMostAligned,
} from "@/src/lib/session/dice-3d-math";
import { slingshotSpeedFromStrength } from "@/src/lib/session/dice-slingshot";

/** Safety-Cap für Sim + Playback (kein fester Taktgeber für Roll-Dauer). */
export const DICE_PHYSICS_MAX_MS = 5000;
/** Mindest-Playback — auch bei sehr schwachem Wurf. */
export const DICE_PHYSICS_MIN_MS = 1800;
/** @deprecated Nur noch Safety/Fallback-Alias — echte Dauer kommt aus der Trajektorie. */
export const DICE_PHYSICS_DURATION_MS = DICE_PHYSICS_MAX_MS;

const TABLE_Y = 0;
/**
 * Basis-Reibung (pro Frame, 120 Hz). Stärkere Würfe liegen näher an STRONG
 * und rollen dadurch länger; Jitter sitzt pro Würfel auf DieSim.planeFriction.
 */
const FRICTION_WEAK = 0.988;
const FRICTION_STRONG = 0.9922;
const WALL_RESTITUTION = 0.34;
const COLLISION_RESTITUTION = 0.4;
/** Baumgarte: nur Teil der Penetration korrigieren → kein Oscillation. */
const BAUMGARTE = 0.22;
const PENETRATION_SLOP = 0.01;
/** Sleep erst bei wirklich langsamer Bewegung — sonst friert Travel zu früh ein. */
const SLEEP_SPEED = 0.12;
/** Festes Sim-Δt (s) — Dauer entsteht aus Reibung + Slingshot-Impuls. */
const SIM_DT = 1 / 120;
const MAX_SIM_SEC = DICE_PHYSICS_MAX_MS / 1000;
/** Weiche Positions-Feinplatzierung nach Sleep aller Würfel. */
const SETTLE_LERP_SEC = 0.48;
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
const _tmpQuat = new THREE.Quaternion();
const _dOmegaQ = new THREE.Quaternion();
const _gravQuat = new THREE.Quaternion();
const _outQuat = new THREE.Quaternion();
const _alignRot = new THREE.Quaternion();
const _corrQuat = new THREE.Quaternion();
const _frameQ = new THREE.Quaternion();
const _faceN = new THREE.Vector3();
const _nServer = new THREE.Vector3();
const _nLanded = new THREE.Vector3();
const _up = new THREE.Vector3();

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
  /** Rest-Tumble (rad); klingt mit dem Ausrollen ab, ohne Ziel-Face. */
  angle0: number;
  /** Extra-Tumble durch Kollisionen (dämpft separat). */
  bumpAngle: number;
  /** Letzte Sim-Geschwindigkeit (für Spin-on-the-spot-Unterdrückung). */
  lastSpeed: number;
  /** Pro-Würfel XZ-Reibung (120 Hz) — bricht Multi-Dice-Sync. */
  planeFriction: number;
  /** Dämpfung für bumpAngle. */
  bumpDamp: number;
  tumbleQ: THREE.Quaternion;
  /** Pfad-integrierte Roll-Rotation (inkrementell, überlebt Achsenwechsel). */
  rollQ: THREE.Quaternion;
  /** Geseedete Startlage — Physik kennt die Server-Face nicht. */
  startQ: THREE.Quaternion;
  /** Server-Ergebnis; erst nach der Sim per Teall-Korrektur angewendet. */
  serverFace: number;
  resting: boolean;
  /** Letzte lebendige Orientierung — Sleep darf nicht auf startQ zurückspringen. */
  frozenQ: THREE.Quaternion;
  orientationFrozen: boolean;
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

/** Gleichverteilte Einheitsquaternion (Shoemake) aus drei Uniform-Samples. */
function randomUnitQuat(
  u1: number,
  u2: number,
  u3: number,
  out: THREE.Quaternion,
): THREE.Quaternion {
  const a = Math.sqrt(Math.max(0, 1 - u1));
  const b = Math.sqrt(Math.max(0, u1));
  const t1 = 2 * Math.PI * u2;
  const t2 = 2 * Math.PI * u3;
  return out.set(a * Math.sin(t1), a * Math.cos(t1), b * Math.sin(t2), b * Math.cos(t2)).normalize();
}

/**
 * Kleinste Rotation, die die aktuell oben liegende Face nach +Y dreht (Y-Twist bleibt).
 */
function alignCurrentFaceUp(
  sides: number,
  q: THREE.Quaternion,
  out: THREE.Quaternion,
): THREE.Quaternion {
  const face = faceValueMostAligned(sides, q);
  faceNormal(sides, face, _faceN).applyQuaternion(q);
  if (_faceN.lengthSq() < 1e-10) return out.copy(q);
  _faceN.normalize();
  diceReadingDirection(_up);
  if (_faceN.dot(_up) > 0.9999) return out.copy(q);
  _alignRot.setFromUnitVectors(_faceN, _up);
  return out.copy(_alignRot).multiply(q);
}

/**
 * Teall-Relabel (lokal): dreht die Face-Normals so, dass `serverFace` genau
 * dort sitzt, wo die Physik `landedFace` hingelegt hat.
 * `visual = physics * setFromUnitVectors(n_server, n_landed)`.
 */
function teallFaceCorrection(
  sides: number,
  serverFace: number,
  landedFace: number,
  out: THREE.Quaternion,
): THREE.Quaternion {
  if (serverFace === landedFace) return out.identity();
  faceNormal(sides, serverFace, _nServer);
  faceNormal(sides, landedFace, _nLanded);
  if (_nServer.dot(_nLanded) > 0.9999) return out.identity();
  return out.setFromUnitVectors(_nServer, _nLanded);
}

/**
 * Orientierung: Roll × Rest-Tumble × geseedete Startlage.
 * Face-Gravity zieht zur nächsten physikalisch flachen Fläche — nicht zur Server-Face.
 */
function writeOrientation(d: DieSim): {
  qx: number;
  qy: number;
  qz: number;
  qw: number;
} {
  if (d.orientationFrozen) {
    return {
      qx: d.frozenQ.x,
      qy: d.frozenQ.y,
      qz: d.frozenQ.z,
      qw: d.frozenQ.w,
    };
  }

  const rollTarget = Math.max(d.angle0, 1e-6);
  const rollProgress = Math.min(1, d.rollAngle / rollTarget);
  const plannedResidual = d.angle0 * (1 - easeOutCubic(rollProgress));
  const tumbleAng = plannedResidual + d.bumpAngle * (1 - rollProgress);

  _outQuat.copy(d.startQ);
  if (tumbleAng > 1e-5) {
    d.tumbleQ.setFromAxisAngle(d.spinAxis, tumbleAng);
    _outQuat.premultiply(d.tumbleQ);
  }
  _outQuat.premultiply(d.rollQ);

  const gravFromSpeed = 1 - smoothstep(SLEEP_SPEED * 0.4, SLEEP_SPEED * 5, d.lastSpeed);
  if (gravFromSpeed > 0.02) {
    alignCurrentFaceUp(d.sides, _outQuat, _gravQuat);
    // Kleines Δ pro 120-Hz-Frame — 0.4 slerp war der 45°-D4-Zuckler.
    _outQuat.slerp(_gravQuat, Math.min(0.05, gravFromSpeed * 0.08));
  }

  return {
    qx: _outQuat.x,
    qy: _outQuat.y,
    qz: _outQuat.z,
    qw: _outQuat.w,
  };
}

/** Friert die aktuelle Pose ein — Sleep darf Roll/Tumble nicht verwerfen. */
function captureRestOrientation(d: DieSim): void {
  if (d.orientationFrozen) return;
  const o = writeOrientation(d);
  d.frozenQ.set(o.qx, o.qy, o.qz, o.qw);
  d.orientationFrozen = true;
}

/**
 * Deterministische 2D-Trajektorien (XZ) mit weicher Kollision.
 * Seeded Sync; Endlagen mit Mindestabstand.
 * Orientierung rollt frei aus; Server-Face kommt per konstanter Teall-Korrektur.
 */
export function buildDiceTrajectories(opts: {
  sides: number;
  faces: number[];
  /** Pro Würfel; fehlt → alle `sides`. */
  dieSides?: number[];
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
    const dieSides = opts.dieSides?.[index] ?? sides;
    const scale = dieScale(dieSides);
    const half = 0.5 * scale;
    const radius = collisionRadius(dieSides);
    const startQ = randomUnitQuat(r(), r(), r(), new THREE.Quaternion());

    const u1 = r();
    const u2 = r();
    const u3 = r();
    const u4 = r();
    const u5 = r();
    const u6 = r();
    const u7 = r();
    const u8 = r();
    const u9 = r();
    const u10 = r();
    const u11 = r();
    const u12 = r();

    const dirAngle = u1 * Math.PI * 2;
    let dirX = Math.cos(dirAngle);
    let dirZ = Math.sin(dirAngle);

    if (hasSlingshotDir) {
      const len = Math.hypot(opts.throwDirX!, opts.throwDirZ!);
      dirX = opts.throwDirX! / len;
      dirZ = opts.throwDirZ! / len;
      const yaw = (u8 - 0.5) * (count > 1 ? 0.64 : 0.26);
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const rdx = dirX * cosY - dirZ * sinY;
      const rdz = dirX * sinY + dirZ * cosY;
      dirX = rdx;
      dirZ = rdz;
    }

    // Breiterer Spawn-Spread + leichter Chaos-Offset, kein Chor-Lineup
    const perpX = -dirZ;
    const perpZ = dirX;
    const spawnSpread = Math.max(
      radius * 2.55,
      Math.min(0.85, 1.35 / Math.max(1, count)),
    );
    const spawnSide =
      (index - (count - 1) / 2) * spawnSpread + (u9 - 0.5) * 0.34;
    const spawnAlong = 0.04 + (u10 - 0.5) * 0.62;

    const x = aimX + dirX * spawnAlong + perpX * spawnSide;
    const z = aimZ + dirZ * spawnAlong + perpZ * spawnSide;

    const useSlingshotImpulse = hasSlingshotDir || isTap || throwStrength !== undefined;
    const speedMul = 0.78 + u3 * 0.5;
    const speed = (useSlingshotImpulse
      ? slingshotSpeedFromStrength(throwStrength, isTap, u11 - 0.5)
      : 3.15 + u3 * 3.4) * speedMul;
    const lateral = 0.85 + (count > 1 ? 0.55 : 0);
    const vx = dirX * speed + (u4 - 0.5) * lateral;
    const vz = dirZ * speed + (u5 - 0.5) * lateral;

    const rollRadius = radius * ROLL_RADIUS_FACTOR * (0.9 + u12 * 0.22);
    const rollAxis = new THREE.Vector3();
    rollAxisFromVelocity(vx, vz, rollAxis);

    const spinAxis = new THREE.Vector3(
      u4 * 2 - 1,
      0.04 + u2 * 0.22,
      u6 * 2 - 1,
    ).normalize();

    const turns = 0.95 + u7 * 2.35;
    const angle0 = turns * Math.PI * 2;

    const strength01 = isTap
      ? 0.42
      : typeof throwStrength === "number"
        ? throwStrength
        : 0.55;
    const baseFriction = THREE.MathUtils.lerp(
      FRICTION_WEAK,
      FRICTION_STRONG,
      strength01,
    );
    const planeFriction = THREE.MathUtils.clamp(
      baseFriction + (u1 - 0.5) * 0.0052,
      0.9855,
      0.9938,
    );
    const bumpDamp = 0.955 + u6 * 0.03;

    return {
      sides: dieSides,
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
      planeFriction,
      bumpDamp,
      tumbleQ: new THREE.Quaternion(),
      rollQ: new THREE.Quaternion(),
      startQ,
      serverFace: face,
      resting: false,
      frozenQ: new THREE.Quaternion(),
      orientationFrozen: false,
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

      d.vx *= d.planeFriction;
      d.vz *= d.planeFriction;
      d.bumpAngle *= d.bumpDamp;

      const spd = speedOf(d);
      d.lastSpeed = spd;

      if (spd > 1e-4) {
        rollAxisFromVelocity(d.vx, d.vz, d.rollAxis);
        const dOmega = (spd * dt) / d.rollRadius;
        d.rollAngle += dOmega;
        _dOmegaQ.setFromAxisAngle(d.rollAxis, dOmega);
        d.rollQ.premultiply(_dOmegaQ);
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
          captureRestOrientation(d);
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
    captureRestOrientation(d);
    d.resting = true;
    d.vx = 0;
    d.vz = 0;
    d.lastSpeed = 0;
    d.restX = d.x;
    d.restZ = d.z;
  }

  const preSettleX = dice.map((d) => d.x);
  const preSettleZ = dice.map((d) => d.z);
  const preSettleQ = dice.map((d) => {
    const last = d.frames[d.frames.length - 1];
    return last
      ? new THREE.Quaternion(last.qx, last.qy, last.qz, last.qw)
      : d.startQ.clone();
  });
  const restOrientQ = preSettleQ.map((q, i) =>
    alignCurrentFaceUp(dice[i]!.sides, q, new THREE.Quaternion()),
  );
  softSeparateRest(dice, 28, REST_SEPARATION_SCALE);

  const physicsEnd = elapsed;
  const settleSteps = Math.max(1, Math.ceil(SETTLE_LERP_SEC / dt));
  for (let i = 1; i <= settleSteps; i++) {
    const settleU = easeInOutCubic(i / settleSteps);
    const tNow = physicsEnd + i * dt;
    for (let di = 0; di < dice.length; di++) {
      const d = dice[di]!;
      _outQuat.copy(preSettleQ[di]!).slerp(restOrientQ[di]!, settleU);
      d.frames.push({
        t: tNow,
        x: THREE.MathUtils.lerp(preSettleX[di]!, d.restX, settleU),
        y: TABLE_Y + d.half,
        z: THREE.MathUtils.lerp(preSettleZ[di]!, d.restZ, settleU),
        qx: _outQuat.x,
        qy: _outQuat.y,
        qz: _outQuat.z,
        qw: _outQuat.w,
      });
    }
  }

  const totalSec = physicsEnd + SETTLE_LERP_SEC;
  const safeTotalSec = Math.max(1e-6, totalSec);
  const durationMs = Math.min(
    DICE_PHYSICS_MAX_MS,
    Math.max(DICE_PHYSICS_MIN_MS, Math.round(safeTotalSec * 1000)),
  );

  for (const d of dice) {
    for (const f of d.frames) {
      f.t = f.t / safeTotalSec;
    }

    const lastPhys = d.frames[d.frames.length - 1];
    if (!lastPhys) continue;
    _frameQ.set(lastPhys.qx, lastPhys.qy, lastPhys.qz, lastPhys.qw);
    const landedFace = faceValueMostAligned(d.sides, _frameQ);
    teallFaceCorrection(d.sides, d.serverFace, landedFace, _corrQuat);

    for (const f of d.frames) {
      _frameQ.set(f.qx, f.qy, f.qz, f.qw).multiply(_corrQuat);
      f.qx = _frameQ.x;
      f.qy = _frameQ.y;
      f.qz = _frameQ.z;
      f.qw = _frameQ.w;
    }

    const last = d.frames[d.frames.length - 1]!;
    last.t = 1;
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
 * Kleiner Seitwärts-Kick + eigener Tumble pro Würfel → kein Spiegel-Duo.
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
        const kickA = (collRng() - 0.5) * 0.28;
        da.vx += -nz * kickA;
        da.vz += nx * kickA;
      }
      if (!db.resting) {
        db.vx += dampJ * nx;
        db.vz += dampJ * nz;
        const kickB = (collRng() - 0.5) * 0.28;
        db.vx += -nz * kickB;
        db.vz += nx * kickB;
      }

      if (!da.resting) da.bumpAngle += 0.08 + collRng() * 0.28;
      if (!db.resting) db.bumpAngle += 0.08 + collRng() * 0.28;
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
