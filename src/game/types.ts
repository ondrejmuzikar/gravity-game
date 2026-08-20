export type GravityId = "down" | "up" | "left" | "right";

export type Rect = { x: number; y: number; w: number; h: number };

export type Vec2 = { x: number; y: number };

export type GravityDir = {
  x: number;
  y: number;
  id: GravityId;
  label: string;
};

export type Level = {
  id: string;
  name: string;
  subtitle: string;
  hint: string;
  par: number;
  solids: Rect[];
  voids: Rect[];
  start: Vec2;
  goal: Vec2;
  goalR: number;
  goalZone: Rect;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  hue: "ember" | "red" | "ice";
};

export type PlayStatus = "playing" | "won" | "lost";
export type LoseReason = "void" | "budget" | null;

export type SimState = {
  levelIndex: number;
  level: Level;
  switchLimit: number | null;
  loseReason: LoseReason;
  ball: Vec2;
  vel: Vec2;
  prev: Vec2;
  gravityIndex: number;
  switches: number;
  status: PlayStatus;
  grounded: boolean;
  landPulse: number;
  squash: number;
  stretch: number;
  trauma: number;
  switchFlash: number;
  particles: Particle[];
  trail: Vec2[];
  winT: number;
  loseT: number;
};

export const WORLD_W = 960;
export const WORLD_H = 540;
export const BALL_R = 13;
export const BORDER = 28;

export const GRAVITY_DIRS: readonly GravityDir[] = [
  { x: 0, y: 1, id: "down", label: "dolů" },
  { x: 0, y: -1, id: "up", label: "nahoru" },
  { x: -1, y: 0, id: "left", label: "doleva" },
  { x: 1, y: 0, id: "right", label: "doprava" },
] as const;

export const GRAVITY_ACCEL = 2550;
export const MAX_SPEED = 980;
export const STEP = 1 / 60;
