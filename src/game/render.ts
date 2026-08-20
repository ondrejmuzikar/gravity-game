import { currentLevel } from "./sim";
import { BALL_R, GRAVITY_DIRS, WORLD_H, WORLD_W, type SimState } from "./types";

const BG = "#101014";
const SOLID = "#1c1c24";
const SOLID_EDGE = "#3a3a46";
const SOLID_INNER = "#16161c";
const VOID = "#2a1214";
const VOID_GLOW = "#c45c48";
const BALL = "#ff5c38";
const BALL_CORE = "#ffd2c4";
const BALL_SHADOW = "#8a2818";
const GOAL = "#efe6d6";
const GOAL_CORE = "#ffffff";

const motes: { x: number; y: number; r: number; a: number }[] = Array.from({ length: 48 }, (_, i) => ({
  x: ((i * 97) % WORLD_W) + (i % 7) * 3,
  y: ((i * 53) % WORLD_H) + (i % 5) * 5,
  r: 0.6 + (i % 4) * 0.35,
  a: 0.04 + (i % 5) * 0.025,
}));

export function draw(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  alpha: number,
  time: number,
  reduced: boolean,
) {
  const level = currentLevel(state);
  const g = GRAVITY_DIRS[state.gravityIndex];

  const trauma = reduced ? 0 : state.trauma * state.trauma;
  const shakeX = trauma * 7 * Math.sin(time * 47);
  const shakeY = trauma * 7 * Math.cos(time * 41);

  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.fillStyle = BG;
  ctx.fillRect(-20, -20, WORLD_W + 40, WORLD_H + 40);

  drawField(ctx, g, time, state.switchFlash);
  drawMotes(ctx, time);

  for (const v of level.voids) drawVoid(ctx, v, time);
  for (const s of level.solids) drawSolid(ctx, s);

  drawGoal(ctx, level.goal.x, level.goal.y, level.goalR, time, state.status === "won");
  drawTrail(ctx, state, alpha);
  drawParticles(ctx, state);
  drawBall(ctx, state, alpha, g);

  ctx.restore();

  if (state.status === "lost") {
    ctx.fillStyle = `rgba(40, 6, 10, ${0.22 * state.loseT})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
  if (state.status === "won") {
    ctx.fillStyle = `rgba(16, 12, 10, ${0.14 * state.winT})`;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }
}

function drawField(
  ctx: CanvasRenderingContext2D,
  g: { x: number; y: number },
  time: number,
  flash: number,
) {
  ctx.save();
  ctx.globalAlpha = 0.06 + flash * 0.1;
  ctx.strokeStyle = BALL;
  ctx.lineWidth = 1;
  const gap = 48;
  const shift = (time * 28) % gap;
  if (Math.abs(g.y) > 0.5) {
    const dir = g.y > 0 ? 1 : -1;
    for (let y = -gap; y < WORLD_H + gap; y += gap) {
      const yy = y + shift * dir;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(WORLD_W, yy);
      ctx.stroke();
    }
  } else {
    const dir = g.x > 0 ? 1 : -1;
    for (let x = -gap; x < WORLD_W + gap; x += gap) {
      const xx = x + shift * dir;
      ctx.beginPath();
      ctx.moveTo(xx, 0);
      ctx.lineTo(xx, WORLD_H);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawMotes(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  for (const m of motes) {
    const y = (m.y + Math.sin(time * 0.3 + m.x) * 6 + WORLD_H) % WORLD_H;
    ctx.fillStyle = `rgba(232, 220, 208, ${m.a})`;
    ctx.beginPath();
    ctx.arc(m.x, y, m.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawSolid(ctx: CanvasRenderingContext2D, s: { x: number; y: number; w: number; h: number }) {
  ctx.save();
  roundRect(ctx, s.x, s.y, s.w, s.h, 5);
  ctx.fillStyle = SOLID;
  ctx.fill();
  ctx.strokeStyle = SOLID_EDGE;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.fillStyle = SOLID_INNER;
  if (s.w > 14 && s.h > 10) {
    roundRect(ctx, s.x + 3, s.y + 3, s.w - 6, s.h - 6, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawVoid(
  ctx: CanvasRenderingContext2D,
  v: { x: number; y: number; w: number; h: number },
  time: number,
) {
  ctx.save();
  roundRect(ctx, v.x, v.y, v.w, v.h, 4);
  ctx.fillStyle = VOID;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = "rgba(196, 92, 72, 0.35)";
  ctx.lineWidth = 2;
  const off = (time * 22) % 14;
  for (let i = -v.h; i < v.w + v.h; i += 14) {
    ctx.beginPath();
    ctx.moveTo(v.x + i + off, v.y);
    ctx.lineTo(v.x + i + off - v.h, v.y + v.h);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  roundRect(ctx, v.x, v.y, v.w, v.h, 4);
  ctx.strokeStyle = VOID_GLOW;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawGoal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  time: number,
  won: boolean,
) {
  const pulse = 1 + Math.sin(time * 3.2) * 0.08 + (won ? 0.18 : 0);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time * 0.7);
  ctx.scale(pulse, pulse);

  ctx.beginPath();
  ctx.arc(0, 0, r * 1.85, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(239, 230, 214, 0.1)";
  ctx.fill();

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = GOAL;
  ctx.fill();
  ctx.strokeStyle = GOAL_CORE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * r * 0.42;
    const py = Math.sin(a) * r * 0.42;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = GOAL_CORE;
  ctx.fill();
  ctx.restore();
}

function drawTrail(ctx: CanvasRenderingContext2D, state: SimState, alpha: number) {
  if (state.trail.length < 2) return;
  ctx.save();
  for (let i = 0; i < state.trail.length; i++) {
    const p = state.trail[i];
    const t = (i + 1) / (state.trail.length + 1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, BALL_R * t * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 92, 56, ${0.1 * t})`;
    ctx.fill();
  }
  void alpha;
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, state: SimState) {
  ctx.save();
  for (const p of state.particles) {
    const a = Math.max(0, p.life);
    const color =
      p.hue === "red"
        ? `rgba(220, 80, 84, ${0.7 * a})`
        : p.hue === "ice"
          ? `rgba(239, 230, 214, ${0.7 * a})`
          : `rgba(255, 92, 56, ${0.75 * a})`;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.5 + a), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  state: SimState,
  alpha: number,
  g: { x: number; y: number },
) {
  const x = state.prev.x + (state.ball.x - state.prev.x) * alpha;
  const y = state.prev.y + (state.ball.y - state.prev.y) * alpha;
  const sx = state.stretch;
  const sy = state.squash;

  ctx.save();
  ctx.translate(x, y);

  ctx.beginPath();
  ctx.arc(0, 0, BALL_R * 2.1, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 92, 56, ${0.16 + state.switchFlash * 0.2})`;
  ctx.fill();

  ctx.save();
  ctx.scale(sx, sy);
  const grd = ctx.createRadialGradient(-4, -5, 2, 0, 0, BALL_R);
  grd.addColorStop(0, BALL_CORE);
  grd.addColorStop(0.45, BALL);
  grd.addColorStop(1, BALL_SHADOW);
  ctx.beginPath();
  ctx.arc(0, 0, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = BALL;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  const ids: Array<{ dx: number; dy: number; on: boolean }> = [
    { dx: 0, dy: 1, on: g.y > 0.5 },
    { dx: 0, dy: -1, on: g.y < -0.5 },
    { dx: -1, dy: 0, on: g.x < -0.5 },
    { dx: 1, dy: 0, on: g.x > 0.5 },
  ];
  for (const d of ids) {
    ctx.globalAlpha = d.on ? 0.95 : 0.16;
    const dist = BALL_R + 9;
    const cx = d.dx * dist;
    const cy = d.dy * dist;
    ctx.beginPath();
    if (d.dx === 0) {
      ctx.moveTo(cx - 5, cy - d.dy * 3);
      ctx.lineTo(cx, cy + d.dy * 3);
      ctx.lineTo(cx + 5, cy - d.dy * 3);
    } else {
      ctx.moveTo(cx - d.dx * 3, cy - 5);
      ctx.lineTo(cx + d.dx * 3, cy);
      ctx.lineTo(cx - d.dx * 3, cy + 5);
    }
    ctx.stroke();
  }
  ctx.restore();
}
