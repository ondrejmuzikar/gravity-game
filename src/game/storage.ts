const KEY = "gravity-switch-v1";

export type SaveData = {
  best: Array<number | null>;
};

function empty(): SaveData {
  return { best: [null, null, null] };
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as SaveData;
    if (!Array.isArray(parsed.best)) return empty();
    return {
      best: [0, 1, 2].map((i) => {
        const v = parsed.best[i];
        return typeof v === "number" && Number.isFinite(v) ? v : null;
      }),
    };
  } catch {
    return empty();
  }
}

export function recordBest(levelIndex: number, switches: number): number | null {
  const save = loadSave();
  const prev = save.best[levelIndex] ?? null;
  if (prev === null || switches < prev) {
    save.best[levelIndex] = switches;
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch {
      /* ignore quota */
    }
    return switches;
  }
  return prev;
}
