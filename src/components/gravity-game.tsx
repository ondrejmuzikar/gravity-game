"use client";

import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { sfx, unlockAudio } from "@/game/audio";
import { LEVELS } from "@/game/levels";
import { draw } from "@/game/render";
import { makeState, queueSwitch, snapshotHud, step } from "@/game/sim";
import { loadSave, recordBest } from "@/game/storage";
import { GRAVITY_DIRS, STEP, WORLD_H, WORLD_W, type PlayStatus, type SimState } from "@/game/types";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Screen = "title" | "play";

const ARROW = {
  down: ArrowDown,
  up: ArrowUp,
  left: ArrowLeft,
  right: ArrowRight,
} as const;

export function GravityGame() {
  const [screen, setScreen] = useState<Screen>("title");
  const [levelIndex, setLevelIndex] = useState(0);
  const [playId, setPlayId] = useState(0);
  const [best, setBest] = useState<Array<number | null>>([null, null, null]);
  const [hud, setHud] = useState({
    switches: 0,
    gravityIndex: 0,
    status: "playing" as PlayStatus,
  });
  const [newBest, setNewBest] = useState(false);

  const simRef = useRef<SimState | null>(null);
  const switchRef = useRef(false);
  const hudRef = useRef(hud);

  useEffect(() => {
    setBest(loadSave().best);
  }, []);

  const syncHud = useCallback((state: SimState) => {
    const next = snapshotHud(state);
    const prev = hudRef.current;
    if (
      prev.switches === next.switches &&
      prev.gravityIndex === next.gravityIndex &&
      prev.status === next.status
    ) {
      return;
    }
    const snap = {
      switches: next.switches,
      gravityIndex: next.gravityIndex,
      status: next.status,
    };
    hudRef.current = snap;
    setHud(snap);
  }, []);

  const startLevel = useCallback((index: number) => {
    unlockAudio();
    sfx.start();
    const state = makeState(index);
    simRef.current = state;
    switchRef.current = false;
    setLevelIndex(index);
    setNewBest(false);
    const snap = {
      switches: 0,
      gravityIndex: 0,
      status: "playing" as PlayStatus,
    };
    hudRef.current = snap;
    setHud(snap);
    setPlayId((n) => n + 1);
    setScreen("play");
  }, []);

  const restart = useCallback(() => {
    startLevel(levelIndex);
  }, [levelIndex, startLevel]);

  const requestSwitch = useCallback(() => {
    unlockAudio();
    switchRef.current = true;
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      {screen === "title" ? (
        <TitleScreen best={best} onPlay={startLevel} />
      ) : (
        <PlayScreen
          key={playId}
          levelIndex={levelIndex}
          hud={hud}
          newBest={newBest}
          simRef={simRef}
          switchRef={switchRef}
          onSwitch={requestSwitch}
          onRestart={restart}
          onMenu={() => setScreen("title")}
          onNext={() => startLevel(Math.min(levelIndex + 1, LEVELS.length - 1))}
          syncHud={syncHud}
          onWin={(switches) => {
            const recorded = recordBest(levelIndex, switches);
            setBest(loadSave().best);
            setNewBest(recorded === switches);
          }}
        />
      )}
    </div>
  );
}

function TitleScreen({
  best,
  onPlay,
}: {
  best: Array<number | null>;
  onPlay: (index: number) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:py-10">
      <header className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-[0.22em] text-muted uppercase">Puzzle · plošinovka</p>
        <AuthChip />
      </header>

      <div className="mt-10 sm:mt-16">
        <h1 className="font-display text-5xl leading-none tracking-tight text-fg sm:text-7xl">
          Gravity
          <span className="block text-ball">Switch</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
          Jediná akce. Čtyři směry gravitace. Dostan kuličku do cíle — a padni
          přitom co nejméněkrát do propasti.
        </p>
      </div>

      <ol className="mt-10 grid gap-3 sm:grid-cols-3">
        {LEVELS.map((level, i) => (
          <li key={level.id}>
            <button
              type="button"
              onClick={() => onPlay(i)}
              className="group flex h-full w-full flex-col rounded-xl border border-border bg-surface p-4 text-left transition-[border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-ball/40 active:scale-[0.99]"
            >
              <span className="flex items-center justify-between text-xs font-medium tracking-wide text-muted uppercase">
                Úroveň {i + 1}
                <span className="text-subtle">{level.subtitle}</span>
              </span>
              <span className="font-display mt-3 text-xl tracking-tight text-fg">{level.name}</span>
              <span className="mt-auto pt-6 text-sm text-muted">
                Rekord{" "}
                <span className="tabular-nums text-fg">
                  {best[i] === null ? "—" : best[i]}
                </span>
                <span className="text-subtle"> · par {level.par}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-muted">
          <span className="font-medium text-fg">Mezerník</span> nebo tlačítko
          přepne gravitaci v cyklu dolů → nahoru → doleva → doprava. Kulička padá,
          dokud nenarazí na plošinu. Červená zóna je propast. Méně přepnutí = lepší
          skóre.
        </p>
      </div>
    </div>
  );
}

function PlayScreen({
  levelIndex,
  hud,
  newBest,
  simRef,
  switchRef,
  onSwitch,
  onRestart,
  onMenu,
  onNext,
  syncHud,
  onWin,
}: {
  levelIndex: number;
  hud: { switches: number; gravityIndex: number; status: PlayStatus };
  newBest: boolean;
  simRef: MutableRefObject<SimState | null>;
  switchRef: MutableRefObject<boolean>;
  onSwitch: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onNext: () => void;
  syncHud: (state: SimState) => void;
  onWin: (switches: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const level = LEVELS[levelIndex];
  const GIcon = ARROW[GRAVITY_DIRS[hud.gravityIndex].id];
  const won = hud.status === "won";
  const lost = hud.status === "lost";

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let time = 0;
    let padWasDown = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let winNotified = false;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "Enter") return;
      if (e.repeat) return;
      const state = simRef.current;
      if (!state || state.status !== "playing") return;
      e.preventDefault();
      onSwitch();
    };

    const onBlur = () => {
      switchRef.current = false;
      padWasDown = false;
    };

    window.addEventListener("keydown", onKey, { passive: false });
    window.addEventListener("blur", onBlur);

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      time += dt;

      const pads = navigator.getGamepads?.() ?? [];
      let padDown = false;
      for (const pad of pads) {
        if (pad?.buttons[0]?.pressed) padDown = true;
      }
      if (padDown && !padWasDown) switchRef.current = true;
      padWasDown = padDown;

      acc += dt;
      const state = simRef.current;
      if (state) {
        while (acc >= STEP) {
          state.prev.x = state.ball.x;
          state.prev.y = state.ball.y;
          if (switchRef.current && state.status === "playing") {
            switchRef.current = false;
            if (queueSwitch(state)) sfx.switch();
          }
          const ev = step(state, STEP);
          if (ev.landed) sfx.land();
          if (ev.died) sfx.die();
          if (ev.won && !winNotified) {
            winNotified = true;
            sfx.win();
            onWin(state.switches);
          }
          acc -= STEP;
        }
        syncHud(state);
      } else {
        acc = 0;
      }

      fit();
      const w = canvas.width;
      const h = canvas.height;
      const scale = Math.min(w / WORLD_W, h / WORLD_H);
      const ox = (w - WORLD_W * scale) / 2;
      const oy = (h - WORLD_H * scale) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#07080c";
      ctx.fillRect(0, 0, w, h);
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      if (state) {
        const alpha = acc / STEP;
        draw(ctx, state, alpha, time, reduced);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [onSwitch, onWin, simRef, switchRef, syncHud]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-3 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
            Úroveň {levelIndex + 1}
          </p>
          <h2 className="font-display truncate text-lg tracking-tight">{level.name}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
          <GIcon className="size-4 text-ball" strokeWidth={2.2} />
          <span className="hidden text-sm text-muted sm:inline">
            {GRAVITY_DIRS[hud.gravityIndex].label}
          </span>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2 text-right">
          <p className="text-xs tracking-wide text-muted uppercase">Přepnutí</p>
          <p className="font-display text-lg leading-none tabular-nums">
            {hud.switches}
            <span className="ml-1 text-xs text-subtle">/ {level.par}</span>
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={onRestart} aria-label="Restart">
          <RotateCcw />
        </Button>
      </header>

      <div
        ref={wrapRef}
        className="relative min-h-0 flex-1 touch-none"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          aria-label="Herní plocha Gravity Switch"
        />

        {(won || lost) && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-bg/55 px-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
              <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">
                {won ? "Cíl" : "Konec"}
              </p>
              <h3 className="font-display mt-2 text-3xl tracking-tight">
                {won ? "Cíl dosažen" : "Propast"}
              </h3>
              {won ? (
                <p className="mt-3 text-sm text-muted">
                  {hud.switches} přepnutí
                  {newBest ? <span className="text-ball"> · nový rekord</span> : null}
                  <span className="text-subtle"> · par {level.par}</span>
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">Kulička spadla do červené zóny.</p>
              )}
              <div className="mt-6 flex flex-col gap-2">
                {won && levelIndex < LEVELS.length - 1 && (
                  <Button onClick={onNext} size="lg">
                    Další úroveň
                  </Button>
                )}
                {won && levelIndex === LEVELS.length - 1 && (
                  <Button onClick={onMenu} size="lg">
                    Menu
                  </Button>
                )}
                <Button variant={won ? "outline" : "default"} onClick={onRestart} size="lg">
                  Znovu
                </Button>
                {!(won && levelIndex === LEVELS.length - 1) && (
                  <Button variant="ghost" onClick={onMenu}>
                    Zpět na výběr
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <p className="mb-2 hidden text-center text-xs text-subtle sm:block">{level.hint}</p>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            if (hud.status !== "playing") return;
            onSwitch();
          }}
          disabled={hud.status !== "playing"}
          className={cn(
            "flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-ball text-base font-semibold text-bg transition-[opacity,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.98] disabled:opacity-40",
          )}
        >
          <GIcon className="size-5" strokeWidth={2.4} />
          Přepnout gravitaci
        </button>
      </div>
    </div>
  );
}

function AuthChip() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-20 animate-pulse rounded-md bg-surface-2" />;
  }
  if (!user) {
    return (
      <Link
        to="/login"
        className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        Přihlásit
      </Link>
    );
  }
  const label = user.displayName ?? user.primaryEmail ?? "Účet";
  return (
    <div className="flex items-center gap-2">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="size-8 rounded-full object-cover"
        />
      ) : (
        <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-medium">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
      {authEnabled && (
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-sm text-muted hover:text-fg"
        >
          Odhlásit
        </button>
      )}
    </div>
  );
}
