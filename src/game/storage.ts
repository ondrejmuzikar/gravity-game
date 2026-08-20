import { LEVELS } from "./levels";

const KEY = "gravity-switch-v2";
const MUTE_KEY = "gravity-switch-muted";

export type SaveData = {
  best: Array<number | null>;
  endlessBest: number;
};

function empty(): SaveData {
  return { best: Array.from({ length: LEVELS.length }, () => null), endlessBest: 0 };
}

function padBest(best: unknown): Array<number | null> {
  const out = Array.from({ length: LEVELS.length }, () => null as number | null);
  if (!Array.isArray(best)) return out;
  for (let i = 0; i < LEVELS.length; i++) {
    const v = best[i];
    out[i] = typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  return out;
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem("gravity-switch-v1");
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      best: padBest(parsed.best),
      endlessBest: typeof parsed.endlessBest === "number" ? parsed.endlessBest : 0,
    };
  } catch {
    return empty();
  }
}

function persist(save: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* ignore quota */
  }
}

export function recordBest(levelIndex: number, switches: number): number | null {
  const save = loadSave();
  const prev = save.best[levelIndex] ?? null;
  if (prev === null || switches < prev) {
    save.best[levelIndex] = switches;
    persist(save);
    return switches;
  }
  return prev;
}

export function recordEndless(streak: number): number {
  const save = loadSave();
  if (streak > save.endlessBest) {
    save.endlessBest = streak;
    persist(save);
  }
  return save.endlessBest;
}

export function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}
