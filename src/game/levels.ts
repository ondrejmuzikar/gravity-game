import { BORDER, WORLD_H, WORLD_W, type Level, type Rect } from "./types";

const T = BORDER;
const B = WORLD_H - BORDER;
const R = WORLD_W - BORDER;

function borders(opts: { bottom?: Rect[] } = {}): Rect[] {
  const bottom = opts.bottom ?? [{ x: 0, y: B, w: WORLD_W, h: BORDER }];
  return [
    { x: 0, y: 0, w: WORLD_W, h: BORDER },
    { x: 0, y: 0, w: BORDER, h: WORLD_H },
    { x: R, y: 0, w: BORDER, h: WORLD_H },
    ...bottom,
  ];
}

export const LEVELS: Level[] = [
  {
    id: "awake",
    name: "Probuzení",
    subtitle: "Snadná",
    hint: "Každý stisk otočí gravitaci v cyklu: dolů → nahoru → doleva → doprava. Přepni, až kulička dopadne.",
    par: 4,
    // UP to ceiling, LEFT to wall, RIGHT across, DOWN onto the goal shelf.
    solids: [
      ...borders({
        bottom: [
          { x: 0, y: B, w: 300, h: BORDER },
          { x: 660, y: B, w: 300, h: BORDER },
        ],
      }),
      { x: T, y: 428, w: 220, h: 20 },
      { x: 688, y: 348, w: R - 688, h: 22 },
    ],
    voids: [{ x: 300, y: B - 6, w: 360, h: BORDER + 6 }],
    start: { x: 132, y: 428 - 14 },
    goal: { x: 900, y: 348 - 20 },
    goalR: 20,
    goalZone: { x: 688, y: 318, w: R - 688, h: 52 },
  },
  {
    id: "chamber",
    name: "Komora",
    subtitle: "Střední",
    hint: "K pravé stěně nedojeď — nahoře je propast. Přepni dolů nad cílovou plošinou.",
    par: 4,
    // Same 4-cycle, but you must DOWN onto a mid platform before the top-right void.
    solids: [
      ...borders({
        bottom: [
          { x: 0, y: B, w: 220, h: BORDER },
          { x: 820, y: B, w: 140, h: BORDER },
        ],
      }),
      { x: T, y: 460, w: 180, h: 20 },
      { x: 340, y: 312, w: 400, h: 20 },
    ],
    voids: [
      { x: 220, y: B - 4, w: 600, h: BORDER + 4 },
      { x: 790, y: T, w: R - 790, h: 120 },
    ],
    start: { x: 112, y: 460 - 14 },
    goal: { x: 540, y: 312 - 20 },
    goalR: 20,
    goalZone: { x: 340, y: 282, w: 400, h: 50 },
  },
  {
    id: "spiral",
    name: "Šachta",
    subtitle: "Těžká",
    hint: "Okno ve stěně je jen v jedné výšce. Do alcovy vletíš doleva, pak krátce doprava a včas dolů.",
    par: 8,
    // UP, LEFT into divider, RIGHT, DOWN onto right shelf, UP onto slab,
    // LEFT through the window, RIGHT briefly, DOWN onto the alcove goal.
    solids: [
      ...borders({ bottom: [] }),
      { x: 300, y: T, w: 22, h: 96 },
      { x: 300, y: 292, w: 22, h: B - 292 },
      { x: 408, y: 470, w: 150, h: 18 },
      { x: 480, y: 336, w: R - 480, h: 18 },
      { x: 480, y: 172, w: R - 480, h: 18 },
      { x: T, y: 272, w: 278, h: 18 },
    ],
    voids: [
      { x: T, y: B - 8, w: WORLD_W - T * 2, h: BORDER + 8 },
      { x: 850, y: T, w: R - 850, h: 78 },
    ],
    start: { x: 480, y: 470 - 14 },
    goal: { x: 140, y: 272 - 22 },
    goalR: 22,
    goalZone: { x: T, y: 236, w: 278, h: 54 },
  },
];
