import {
  BALL_R,
  GRAVITY_ACCEL,
  GRAVITY_DIRS,
  MAX_SPEED,
  WORLD_H,
  WORLD_W,
  type Level,
  type LoseReason,
  type Particle,
  type PlayStatus,
  type Rect,
  type SimState,
  type Vec2,
} from "./types";

const TRAIL_MAX = 14;
const PARTICLE_MAX = 72;

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function circleHitsRect(cx: number, cy: number, r: number, rec: Rect): boolean {
  const px = clamp(cx, rec.x, rec.x + rec.w);
  const py = clamp(cy, rec.y, rec.y + rec.h);
  const dx = cx - px;
  const dy = cy - py;
  return dx * dx + dy * dy < r * r;
}

type Hit = { nx: number; ny: number; pen: number };

function circleVsAabb(cx: number, cy: number, r: number, rec: Rect): Hit | null {
  const left = rec.x;
  const right = rec.x + rec.w;
  const top = rec.y;
  const bottom = rec.y + rec.h;

  if (cx > left && cx < right && cy > top && cy < bottom) {
    const dl = cx - left;
    const dr = right - cx;
    const dt = cy - top;
    const db = bottom - cy;
    const min = Math.min(dl, dr, dt, db);
    if (min === dl) return { nx: -1, ny: 0, pen: r + dl };
    if (min === dr) return { nx: 1, ny: 0, pen: r + dr };
    if (min === dt) return { nx: 0, ny: -1, pen: r + dt };
    return { nx: 0, ny: 1, pen: r + db };
  }

  const px = clamp(cx, left, right);
  const py = clamp(cy, top, bottom);
  const dx = cx - px;
  const dy = cy - py;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 < 1e-8) {
    const dl = Math.abs(cx - left);
    const dr = Math.abs(right - cx);
    const dt = Math.abs(cy - top);
    const db = Math.abs(bottom - cy);
    const min = Math.min(dl, dr, dt, db);
    if (min === dl) return { nx: -1, ny: 0, pen: r };
    if (min === dr) return { nx: 1, ny: 0, pen: r };
    if (min === dt) return { nx: 0, ny: -1, pen: r };
    return { nx: 0, ny: 1, pen: r };
  }
  const d = Math.sqrt(d2);
  return { nx: dx / d, ny: dy / d, pen: r - d };
}

function spawnParticles(
  state: SimState,
  x: number,
  y: number,
  dirx: number,
  diry: number,
  count: number,
  hue: Particle["hue"],
  speed: number,
) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= PARTICLE_MAX) state.particles.shift();
    const spread = (Math.random() - 0.5) * 1.4;
    const px = -diry * spread + dirx * (0.4 + Math.random());
    const py = dirx * spread + diry * (0.4 + Math.random());
    const s = speed * (0.45 + Math.random() * 0.8);
    state.particles.push({
      x,
      y,
      vx: px * s,
      vy: py * s,
      life: 1,
      max: 0.28 + Math.random() * 0.28,
      size: 1.4 + Math.random() * 2.4,
      hue,
    });
  }
}

export function makeState(
  level: Level,
  opts?: { levelIndex?: number; switchLimit?: number | null },
): SimState {
  return {
    levelIndex: opts?.levelIndex ?? 0,
    level,
    switchLimit: opts?.switchLimit ?? null,
    loseReason: null,
    ball: { x: level.start.x, y: level.start.y },
    vel: { x: 0, y: 0 },
    prev: { x: level.start.x, y: level.start.y },
    gravityIndex: 0,
    switches: 0,
    status: "playing",
    grounded: false,
    landPulse: 0,
    squash: 1,
    stretch: 1,
    trauma: 0,
    switchFlash: 0,
    particles: [],
    trail: [],
    winT: 0,
    loseT: 0,
  };
}

export function currentLevel(state: SimState): Level {
  return state.level;
}

export function queueSwitch(state: SimState): boolean {
  if (state.status !== "playing") return false;
  if (state.switchLimit != null && state.switches >= state.switchLimit) {
    die(state, "budget");
    return false;
  }
  state.gravityIndex = (state.gravityIndex + 1) % GRAVITY_DIRS.length;
  state.switches += 1;
  state.switchFlash = 1;
  state.grounded = false;
  const g = GRAVITY_DIRS[state.gravityIndex];
  const tangent = g.x * state.vel.y - g.y * state.vel.x;
  state.vel.x = -g.y * tangent * 0.35 + g.x * 40;
  state.vel.y = g.x * tangent * 0.35 + g.y * 40;
  spawnParticles(state, state.ball.x, state.ball.y, g.x, g.y, 10, "ember", 220);
  return true;
}

function resolveSolids(state: SimState, solids: Rect[], g: Vec2) {
  let grounded = false;
  for (let pass = 0; pass < 3; pass++) {
    for (const rec of solids) {
      const hit = circleVsAabb(state.ball.x, state.ball.y, BALL_R, rec);
      if (!hit) continue;
      state.ball.x += hit.nx * hit.pen;
      state.ball.y += hit.ny * hit.pen;
      const vn = state.vel.x * hit.nx + state.vel.y * hit.ny;
      if (vn < 0) {
        state.vel.x -= vn * hit.nx;
        state.vel.y -= vn * hit.ny;
        const impact = -vn;
        if (impact > 90 && state.landPulse < 0.12) {
          state.landPulse = 1;
          state.trauma = Math.min(1, state.trauma + impact / 1400);
          spawnParticles(
            state,
            state.ball.x - hit.nx * BALL_R,
            state.ball.y - hit.ny * BALL_R,
            hit.nx,
            hit.ny,
            6,
            "ice",
            160 + impact * 0.08,
          );
        }
      }
      if (hit.nx * g.x + hit.ny * g.y < -0.45) grounded = true;
    }
  }
  return grounded;
}

export function step(state: SimState, dt: number): { landed: boolean; died: boolean; won: boolean } {
  const out = { landed: false, died: false, won: false };
  if (state.status !== "playing") {
    state.winT = Math.min(1, state.winT + dt * 1.8);
    state.loseT = Math.min(1, state.loseT + dt * 2.2);
    decayFx(state, dt);
    return out;
  }

  const level = state.level;
  const g = GRAVITY_DIRS[state.gravityIndex];
  const wasGrounded = state.grounded;

  state.vel.x += g.x * GRAVITY_ACCEL * dt;
  state.vel.y += g.y * GRAVITY_ACCEL * dt;

  const spd = Math.hypot(state.vel.x, state.vel.y);
  if (spd > MAX_SPEED) {
    const k = MAX_SPEED / spd;
    state.vel.x *= k;
    state.vel.y *= k;
  }

  const moveX = state.vel.x * dt;
  const moveY = state.vel.y * dt;
  const dist = Math.hypot(moveX, moveY);
  const steps = Math.max(1, Math.ceil(dist / (BALL_R * 0.45)));
  const sx = moveX / steps;
  const sy = moveY / steps;

  for (let i = 0; i < steps; i++) {
    state.ball.x += sx;
    state.ball.y += sy;
    state.grounded = resolveSolids(state, level.solids, g);
    if (state.status !== "playing") break;
  }

  if (state.grounded && !wasGrounded && spd > 80) out.landed = true;

  for (const v of level.voids) {
    if (circleHitsRect(state.ball.x, state.ball.y, BALL_R * 0.72, v)) {
      die(state, "void");
      out.died = true;
      break;
    }
  }

  if (
    state.ball.x < -40 ||
    state.ball.x > WORLD_W + 40 ||
    state.ball.y < -40 ||
    state.ball.y > WORLD_H + 40
  ) {
    die(state, "void");
    out.died = true;
  }

  if (state.status === "playing") {
    const dx = state.ball.x - level.goal.x;
    const dy = state.ball.y - level.goal.y;
    const inCircle = dx * dx + dy * dy < (BALL_R + level.goalR) * (BALL_R + level.goalR);
    const inZone = circleHitsRect(state.ball.x, state.ball.y, BALL_R * 0.85, level.goalZone);
    if (inCircle || inZone) {
      state.status = "won";
      state.winT = 0;
      state.vel.x *= 0.2;
      state.vel.y *= 0.2;
      state.trauma = Math.min(1, state.trauma + 0.45);
      spawnParticles(state, level.goal.x, level.goal.y, 0, -1, 22, "ice", 280);
      spawnParticles(state, level.goal.x, level.goal.y, 0, 1, 10, "ember", 220);
      out.won = true;
    }
  }

  const speedNow = Math.hypot(state.vel.x, state.vel.y);
  const along = Math.abs(g.x) > 0.5;
  const stretch = 1 + Math.min(0.22, speedNow / 2200);
  if (along) {
    state.stretch = stretch;
    state.squash = 1 / stretch;
  } else {
    state.stretch = 1 / stretch;
    state.squash = stretch;
  }
  if (state.landPulse > 0.5) {
    state.squash *= 1.18;
    state.stretch *= 0.84;
  }

  state.trail.push({ x: state.ball.x, y: state.ball.y });
  if (state.trail.length > TRAIL_MAX) state.trail.shift();

  decayFx(state, dt);
  return out;
}

function die(state: SimState, reason: LoseReason) {
  if (state.status !== "playing") return;
  state.status = "lost";
  state.loseReason = reason;
  state.loseT = 0;
  state.trauma = 1;
  spawnParticles(state, state.ball.x, state.ball.y, 0, -1, 18, "red", 340);
}

function decayFx(state: SimState, dt: number) {
  state.landPulse = Math.max(0, state.landPulse - dt * 4.5);
  state.switchFlash = Math.max(0, state.switchFlash - dt * 3.2);
  state.trauma = Math.max(0, state.trauma - dt * 1.8);
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt / p.max;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

export function snapshotHud(state: SimState): {
  switches: number;
  gravityIndex: number;
  status: PlayStatus;
  grounded: boolean;
  loseReason: LoseReason;
} {
  return {
    switches: state.switches,
    gravityIndex: state.gravityIndex,
    status: state.status,
    grounded: state.grounded,
    loseReason: state.loseReason,
  };
}
