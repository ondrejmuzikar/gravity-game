import { BALL_R, GRAVITY_DIRS, WORLD_H, WORLD_W, type Level, type Rect } from "./types";

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function hits(cx: number, cy: number, r: number, rec: Rect): boolean {
  const px = clamp(cx, rec.x, rec.x + rec.w);
  const py = clamp(cy, rec.y, rec.y + rec.h);
  const dx = cx - px;
  const dy = cy - py;
  return dx * dx + dy * dy < r * r;
}

function anyHit(cx: number, cy: number, r: number, rects: Rect[]): boolean {
  for (let i = 0; i < rects.length; i++) {
    if (hits(cx, cy, r, rects[i])) return true;
  }
  return false;
}

function inGoal(cx: number, cy: number, level: Level): boolean {
  const dx = cx - level.goal.x;
  const dy = cy - level.goal.y;
  if (dx * dx + dy * dy < (BALL_R + level.goalR) * (BALL_R + level.goalR)) return true;
  return hits(cx, cy, BALL_R * 0.85, level.goalZone);
}

/**
 * Shortest number of gravity switches that still reach the goal.
 * Fall is free; each switch costs 1. Null = unsolvable within `maxSwitches`.
 */
export function shortestSwitches(level: Level, maxSwitches = 16): number | null {
  const STEP = 10;
  const cols = Math.floor(WORLD_W / STEP) + 1;
  const rows = Math.floor(WORLD_H / STEP) + 1;
  const pack = (c: number, r: number, g: number) => (g * rows + r) * cols + c;
  const vis = new Uint8Array(cols * rows * 4);

  const x0 = level.start.x;
  let y0 = level.start.y;
  for (let i = 0; i < 10 && anyHit(x0, y0, BALL_R, level.solids); i++) y0 -= 2;
  if (anyHit(x0, y0, BALL_R * 0.72, level.voids)) return null;

  type Node = { x: number; y: number; g: number };
  let layer: Node[] = [{ x: x0, y: y0, g: 0 }];
  vis[pack(clamp(Math.round(x0 / STEP), 0, cols - 1), clamp(Math.round(y0 / STEP), 0, rows - 1), 0)] = 1;

  const solids = level.solids;
  const voids = level.voids;

  for (let k = 0; k <= maxSwitches; k++) {
    const fall: Node[] = layer.slice();
    const next: Node[] = [];
    let fi = 0;
    while (fi < fall.length) {
      const cur = fall[fi++];
      if (inGoal(cur.x, cur.y, level)) return k;

      const dir = GRAVITY_DIRS[cur.g];
      const nx = cur.x + dir.x * STEP;
      const ny = cur.y + dir.y * STEP;
      if (nx >= 4 && nx <= WORLD_W - 4 && ny >= 4 && ny <= WORLD_H - 4) {
        if (!anyHit(nx, ny, BALL_R * 0.72, voids) && !anyHit(nx, ny, BALL_R, solids)) {
          const nc = clamp(Math.round(nx / STEP), 0, cols - 1);
          const nr = clamp(Math.round(ny / STEP), 0, rows - 1);
          const id = pack(nc, nr, cur.g);
          if (!vis[id]) {
            vis[id] = 1;
            fall.push({ x: nx, y: ny, g: cur.g });
          }
        }
      }

      if (k < maxSwitches) {
        const g2 = (cur.g + 1) & 3;
        const cc = clamp(Math.round(cur.x / STEP), 0, cols - 1);
        const rr = clamp(Math.round(cur.y / STEP), 0, rows - 1);
        const sid = pack(cc, rr, g2);
        if (!vis[sid]) {
          vis[sid] = 1;
          next.push({ x: cur.x, y: cur.y, g: g2 });
        }
      }
    }
    layer = next;
  }

  return null;
}
