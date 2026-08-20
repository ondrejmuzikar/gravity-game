import { B, L, R, T, clamp, floorVoid, goalFromPad, lerp, mulberry32, restAbove, walls } from "./kit";
import { shortestSwitches } from "./solver";
import { BORDER, WORLD_W, type Level, type Rect } from "./types";

export type EndlessRoom = {
  level: Level;
  par: number;
  budget: number;
  stage: number;
  seed: number;
};

function rngRange(rng: () => number, a: number, b: number) {
  return a + rng() * (b - a);
}

function shelfRoom(rng: () => number, stage: number): Level {
  const t = clamp(stage / 14, 0, 1);
  const startW = lerp(200, 120, t) + rngRange(rng, -10, 16);
  const startY = lerp(440, 400, t);
  const goalW = lerp(230, 96, t) + rngRange(rng, -8, 18);
  const goalY = lerp(350, 250, t) + rngRange(rng, -16, 16);
  const voidW = lerp(340, 520, t);
  const voidX = clamp(240 + rngRange(rng, 0, 80), 180, 400);
  const start: Rect = { x: L, y: startY, w: startW, h: 20 };
  const goalPad: Rect = { x: R - goalW, y: goalY, w: goalW, h: 20 };
  const extra: Rect[] = [];
  if (stage >= 3) {
    extra.push({
      x: rngRange(rng, 430, 620),
      y: T,
      w: lerp(50, 90, t),
      h: lerp(40, 90, t),
    });
  }
  if (stage >= 7) {
    extra.push({
      x: rngRange(rng, 300, 480),
      y: lerp(220, 300, t),
      w: lerp(90, 50, t),
      h: 16,
    });
  }
  const leftFloor = voidX;
  const rightFloorX = voidX + voidW;
  return {
    id: `end-shelf-${stage}`,
    name: "Místnost",
    subtitle: "Nekonečno",
    hint: "Strop, stěna, přelet, pád. V tomhle pořadí.",
    par: 4,
    solids: [
      ...walls([
        { x: 0, y: B, w: leftFloor, h: BORDER },
        { x: rightFloorX, y: B, w: WORLD_W - rightFloorX, h: BORDER },
      ]),
      start,
      goalPad,
      ...extra,
    ],
    voids: [floorVoid(voidX, voidW)],
    start: restAbove(start),
    ...goalFromPad(goalPad),
  };
}

function dropRoom(rng: () => number, stage: number): Level {
  const t = clamp(stage / 14, 0, 1);
  const startW = lerp(180, 110, t);
  const start: Rect = { x: L, y: 448, w: startW, h: 20 };
  const goalW = lerp(380, 220, t);
  const goalPad: Rect = { x: 340, y: lerp(320, 290, t), w: goalW, h: 20 };
  const ceilVoidX = lerp(760, 700, t);
  return {
    id: `end-drop-${stage}`,
    name: "Místnost",
    subtitle: "Nekonečno",
    hint: "K pravé stěně nedojeď. Pád je dřív, než si myslíš.",
    par: 4,
    solids: [
      ...walls([
        { x: 0, y: B, w: 210, h: BORDER },
        { x: 820, y: B, w: 140, h: BORDER },
      ]),
      start,
      goalPad,
    ],
    voids: [floorVoid(210, 610), { x: ceilVoidX, y: T, w: R - ceilVoidX, h: lerp(90, 140, t) }],
    start: restAbove(start),
    ...goalFromPad(goalPad),
  };
}

function windowRoom(rng: () => number, stage: number): Level {
  const t = clamp(stage / 16, 0, 1);
  const divX = lerp(300, 360, t) + rngRange(rng, -12, 18);
  const winTop = lerp(124, 90, t);
  const winH = lerp(168, 88, t);
  const winBot = winTop + winH;
  const start: Rect = { x: 420, y: 468, w: lerp(150, 100, t), h: 18 };
  const goalPad: Rect = { x: L, y: lerp(272, 240, t), w: divX - L - 8, h: 18 };
  const shelfY = lerp(336, 300, t);
  const extra: Rect[] = [
    { x: divX, y: T, w: 22, h: winTop - T },
    { x: divX, y: winBot, w: 22, h: B - winBot },
    { x: 480, y: shelfY, w: R - 480, h: 18 },
    { x: 480, y: lerp(172, 150, t), w: R - 480, h: 18 },
  ];
  if (stage >= 8) {
    extra.push({ x: rngRange(rng, 560, 700), y: T, w: 70, h: lerp(50, 80, t) });
  }
  return {
    id: `end-window-${stage}`,
    name: "Místnost",
    subtitle: "Nekonečno",
    hint: "Okno je jen v jedné výšce. Nech se jím prostrčit, ne jím proletět naslepo.",
    par: 8,
    solids: [...walls("none"), start, goalPad, ...extra],
    voids: [floorVoid(T, WORLD_W - T * 2), { x: 850, y: T, w: R - 850, h: 70 }],
    start: restAbove(start),
    ...goalFromPad(goalPad, 20),
  };
}

function pickTemplate(rng: () => number, stage: number): Level {
  if (stage < 3) return rng() < 0.55 ? shelfRoom(rng, stage) : dropRoom(rng, stage);
  if (stage < 7) {
    const r = rng();
    if (r < 0.4) return shelfRoom(rng, stage);
    if (r < 0.75) return dropRoom(rng, stage);
    return windowRoom(rng, stage);
  }
  if (rng() < 0.65) return windowRoom(rng, stage);
  return dropRoom(rng, stage);
}

function budgetFor(stage: number, par: number) {
  const extra = Math.max(1, 6 - Math.floor(stage / 2));
  return par + extra;
}

export function generateEndless(seed: number, stage: number): EndlessRoom {
  const minPar = stage < 4 ? 3 : 4;
  const maxPar = stage < 6 ? 8 : 12;
  for (let attempt = 0; attempt < 36; attempt++) {
    const rng = mulberry32((seed + stage * 0x9e3779b9 + attempt * 7919) >>> 0);
    const level = pickTemplate(rng, stage);
    const par = shortestSwitches(level, maxPar);
    if (par == null || par < minPar) continue;
    level.par = par;
    level.name = `Místnost ${stage + 1}`;
    return {
      level,
      par,
      budget: budgetFor(stage, par),
      stage,
      seed,
    };
  }
  const rng = mulberry32((seed + 7) >>> 0);
  const level = shelfRoom(rng, 0);
  const par = shortestSwitches(level, 12) ?? 4;
  level.par = par;
  level.name = `Místnost ${stage + 1}`;
  return { level, par, budget: budgetFor(stage, par), stage, seed };
}
