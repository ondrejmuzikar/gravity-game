import { BALL_R, BORDER, WORLD_H, WORLD_W, type Level, type Rect, type Vec2 } from "./types";

export const T = BORDER;
export const B = WORLD_H - BORDER;
export const L = BORDER;
export const R = WORLD_W - BORDER;

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function walls(bottom: Rect[] | "full" | "none" = "full"): Rect[] {
  const out: Rect[] = [
    { x: 0, y: 0, w: WORLD_W, h: BORDER },
    { x: 0, y: 0, w: BORDER, h: WORLD_H },
    { x: R, y: 0, w: BORDER, h: WORLD_H },
  ];
  if (bottom === "full") out.push({ x: 0, y: B, w: WORLD_W, h: BORDER });
  else if (bottom !== "none") out.push(...bottom);
  return out;
}

export function restAbove(pad: Rect): Vec2 {
  return { x: pad.x + pad.w * 0.5, y: pad.y - BALL_R - 1 };
}

export function goalFromPad(
  pad: Rect,
  r = 18,
): Pick<Level, "goal" | "goalR" | "goalZone"> {
  return {
    goal: { x: pad.x + pad.w * 0.5, y: pad.y - 22 },
    goalR: r,
    goalZone: { x: pad.x, y: pad.y - 42, w: Math.max(pad.w, 48), h: 50 },
  };
}

export function floorVoid(x: number, w: number): Rect {
  return { x, y: B - 8, w, h: BORDER + 8 };
}

export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
