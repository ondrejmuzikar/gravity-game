"use client";

import { Link } from "@tanstack/react-router";
import { ArrowUp, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { setMuted as setAudioMuted, sfx, startMusic, unlockAudio } from "@/game/audio";
import { generateEndless, type EndlessRoom } from "@/game/generate";
import { LEVELS } from "@/game/levels";
import { draw } from "@/game/render";
import { makeState, queueSwitch, snapshotHud, step } from "@/game/sim";
import { loadMuted, loadSave, persistMuted, recordBest, recordEndless } from "@/game/storage";
import {
  GRAVITY_DIRS,
  STEP,
  WORLD_H,
  WORLD_W,
  type Level,
  type LoseReason,
  type PlayStatus,
  type SimState,
} from "@/game/types";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Screen = "title" | "play";
type Mode = "campaign" | "endless";

const HEADING: Record<(typeof GRAVITY_DIRS)[number]["id"], number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

function unwrapDeg(from: number, to: number) {
  const target = ((to % 360) + 360) % 360;
  let best = target;
  let dist = Infinity;
  for (let k = -2; k <= 2; k++) {
    const cand = target + k * 360;
    const d = Math.abs(cand - from);
    if (d < dist) {
      dist = d;
      best = cand;
    }
  }
  return best;
}

export function GravityGame() {
  const [screen, setScreen] = useState<Screen>("title");
  const [mode, setMode] = useState<Mode>("campaign");
  const [levelIndex, setLevelIndex] = useState(0);
  const [playId, setPlayId] = useState(0);
  const [best, setBest] = useState<Array<number | null>>(() => LEVELS.map(() => null));
  const [endlessBest, setEndlessBest] = useState(0);
  const [endless, setEndless] = useState<EndlessRoom | null>(null);
  const [streak, setStreak] = useState(0);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({
    switches: 0,
    gravityIndex: 0,
    status: "playing" as PlayStatus,
    loseReason: null as LoseReason,
  });
  const [newBest, setNewBest] = useState(false);

  const simRef = useRef<SimState | null>(null);
  const switchRef = useRef(false);
  const hudRef = useRef(hud);

  useEffect(() => {
    const save = loadSave();
    setBest(save.best);
    setEndlessBest(save.endlessBest);
    const m = loadMuted();
    setMuted(m);
    setAudioMuted(m);
  }, []);

  useEffect(() => {
    const boot = () => {
      unlockAudio();
      startMusic();
    };
    window.addEventListener("pointerdown", boot, { once: true });
    window.addEventListener("keydown", boot, { once: true });
    return () => {
      window.removeEventListener("pointerdown", boot);
      window.removeEventListener("keydown", boot);
    };
  }, []);

  const toggleMute = useCallback(() => {
    unlockAudio();
    startMusic();
    setMuted((prev) => {
      const next = !prev;
      setAudioMuted(next);
      persistMuted(next);
      return next;
    });
  }, []);

  const syncHud = useCallback((state: SimState) => {
    const next = snapshotHud(state);
    const prev = hudRef.current;
    if (
      prev.switches === next.switches &&
      prev.gravityIndex === next.gravityIndex &&
      prev.status === next.status &&
      prev.loseReason === next.loseReason
    ) {
      return;
    }
    const snap = {
      switches: next.switches,
      gravityIndex: next.gravityIndex,
      status: next.status,
      loseReason: next.loseReason,
    };
    hudRef.current = snap;
    setHud(snap);
  }, []);

  const bootPlay = useCallback(
    (level: Level, opts: { mode: Mode; index: number; room?: EndlessRoom; switchLimit?: number | null }) => {
      unlockAudio();
      startMusic();
      sfx.start();
      const state = makeState(level, {
        levelIndex: opts.index,
        switchLimit: opts.switchLimit ?? null,
      });
      simRef.current = state;
      switchRef.current = false;
      setMode(opts.mode);
      setLevelIndex(opts.index);
      if (opts.room) setEndless(opts.room);
      setNewBest(false);
      const snap = {
        switches: 0,
        gravityIndex: 0,
        status: "playing" as PlayStatus,
        loseReason: null as LoseReason,
      };
      hudRef.current = snap;
      setHud(snap);
      setPlayId((n) => n + 1);
      setScreen("play");
    },
    [],
  );

  const startLevel = useCallback(
    (index: number) => {
      const level = LEVELS[index] ?? LEVELS[0];
      bootPlay(level, { mode: "campaign", index });
    },
    [bootPlay],
  );

  const startEndless = useCallback(
    (seed?: number, stage = 0, nextStreak = 0) => {
      const s = seed ?? ((Date.now() ^ ((Math.random() * 0x7fffffff) | 0)) >>> 0);
      const room = generateEndless(s, stage);
      setStreak(nextStreak);
      bootPlay(room.level, {
        mode: "endless",
        index: stage,
        room,
        switchLimit: room.budget,
      });
    },
    [bootPlay],
  );

  const restart = useCallback(() => {
    if (mode === "endless") {
      startEndless();
      return;
    }
    startLevel(levelIndex);
  }, [mode, levelIndex, startLevel, startEndless]);

  const requestSwitch = useCallback(() => {
    unlockAudio();
    switchRef.current = true;
  }, []);

  const activeLevel = mode === "endless" && endless ? endless.level : LEVELS[levelIndex] ?? LEVELS[0];
  const switchLimit = mode === "endless" ? (endless?.budget ?? null) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      {screen === "title" ? (
        <TitleScreen
          best={best}
          endlessBest={endlessBest}
          muted={muted}
          onMute={toggleMute}
          onPlay={startLevel}
          onEndless={() => startEndless()}
        />
      ) : (
        <PlayScreen
          key={playId}
          mode={mode}
          level={activeLevel}
          levelIndex={levelIndex}
          totalLevels={LEVELS.length}
          streak={streak}
          switchLimit={switchLimit}
          hud={hud}
          newBest={newBest}
          muted={muted}
          simRef={simRef}
          switchRef={switchRef}
          onMute={toggleMute}
          onSwitch={requestSwitch}
          onRestart={restart}
          onMenu={() => setScreen("title")}
          onNext={() => {
            if (mode === "endless" && endless) {
              const nextStreak = streak + 1;
              startEndless(endless.seed, endless.stage + 1, nextStreak);
              return;
            }
            startLevel(Math.min(levelIndex + 1, LEVELS.length - 1));
          }}
          syncHud={syncHud}
          onWin={(switches) => {
            if (mode === "endless") {
              const next = streak + 1;
              setEndlessBest(recordEndless(next));
              return;
            }
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
  endlessBest,
  muted,
  onMute,
  onPlay,
  onEndless,
}: {
  best: Array<number | null>;
  endlessBest: number;
  muted: boolean;
  onMute: () => void;
  onPlay: (index: number) => void;
  onEndless: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:py-10">
      <header className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] font-medium tracking-[0.22em] text-muted uppercase">
          Čtyři směry. Jedna koule.
        </p>
        <div className="flex items-center gap-1">
          <MuteButton muted={muted} onClick={onMute} />
          <AuthChip />
        </div>
      </header>

      <div className="mt-10 sm:mt-14">
        <h1 className="font-display text-5xl leading-none font-semibold tracking-tight text-fg sm:text-7xl">
          Gravity
          <span className="block text-ball">Switch</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
          Koule umí jedinou věc: padat. Ty jí říkáš kam. Jáma čeká na každou
          zbytečnou otočku.
        </p>
      </div>

      <button
        type="button"
        onClick={onEndless}
        className="mt-10 flex w-full flex-col rounded-xl border border-ball/30 bg-surface p-5 text-left transition-[border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-ball/70 active:scale-[0.995]"
      >
        <span className="font-mono text-[11px] tracking-[0.18em] text-ball uppercase">Nekonečno</span>
        <span className="font-display mt-2 text-2xl tracking-tight">Dokud dojdou stisky</span>
        <span className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          Místnosti se skládají za běhu. Každá je řešitelná. Rozpočet otoček se krátí.
        </span>
        <span className="mt-4 font-mono text-sm text-fg">
          rekord série{" "}
          <span className="text-ball">{endlessBest === 0 ? "—" : endlessBest}</span>
        </span>
      </button>

      <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {LEVELS.map((level, i) => (
          <li key={level.id}>
            <button
              type="button"
              onClick={() => onPlay(i)}
              className="group flex h-full w-full flex-col rounded-lg border border-border bg-surface px-3 py-3 text-left transition-[border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-ball/40 active:scale-[0.99]"
            >
              <span className="flex items-center justify-between font-mono text-[11px] text-subtle">
                {String(i + 1).padStart(2, "0")}
                <span className="text-[10px] tracking-wide uppercase">{level.subtitle}</span>
              </span>
              <span className="font-display mt-2 text-[15px] leading-tight tracking-tight text-fg">
                {level.name}
              </span>
              <span className="mt-auto pt-3 font-mono text-xs text-muted">
                <span className="tabular-nums text-fg">{best[i] === null ? "—" : best[i]}</span>
                <span className="text-subtle"> / {level.par}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="text-sm leading-relaxed text-muted">
          <span className="font-medium text-fg">Mezerník</span> posune gravitaci
          v cyklu dolů → nahoru → doleva → doprava. Šipka na tlačítku ukazuje,
          kam poletíš po dalším stisku. Míň otoček je čistší průchod.
        </p>
      </div>
    </div>
  );
}

function PlayScreen({
  mode,
  level,
  levelIndex,
  totalLevels,
  streak,
  switchLimit,
  hud,
  newBest,
  muted,
  simRef,
  switchRef,
  onMute,
  onSwitch,
  onRestart,
  onMenu,
  onNext,
  syncHud,
  onWin,
}: {
  mode: Mode;
  level: Level;
  levelIndex: number;
  totalLevels: number;
  streak: number;
  switchLimit: number | null;
  hud: { switches: number; gravityIndex: number; status: PlayStatus; loseReason: LoseReason };
  newBest: boolean;
  muted: boolean;
  simRef: MutableRefObject<SimState | null>;
  switchRef: MutableRefObject<boolean>;
  onMute: () => void;
  onSwitch: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onNext: () => void;
  syncHud: (state: SimState) => void;
  onWin: (switches: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const won = hud.status === "won";
  const lost = hud.status === "lost";
  const lastCampaign = mode === "campaign" && levelIndex >= totalLevels - 1;
  const cap = switchLimit ?? level.par;

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
            else sfx.die();
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
      ctx.fillStyle = "#101014";
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
      <header className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-muted uppercase">
            {mode === "endless"
              ? `Série ${streak}`
              : `${String(levelIndex + 1).padStart(2, "0")} / ${String(totalLevels).padStart(2, "0")}`}
          </p>
          <h2 className="font-display truncate text-lg tracking-tight">{level.name}</h2>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2 text-right">
          <p className="font-mono text-[10px] tracking-wide text-muted uppercase">
            {mode === "endless" ? "Stisky" : "Otočky"}
          </p>
          <p className="font-mono text-lg leading-none tabular-nums">
            {hud.switches}
            <span className="ml-1 text-xs text-subtle">/ {cap}</span>
          </p>
        </div>
        <MuteButton muted={muted} onClick={onMute} />
        <Button variant="outline" size="icon" onClick={onRestart} aria-label="Znovu">
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
          <div className="absolute inset-0 z-10 grid place-items-center bg-bg/60 px-4">
            <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6">
              <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-muted uppercase">
                {won ? "Drží" : "Pád"}
              </p>
              <h3 className="font-display mt-2 text-3xl tracking-tight">
                {won
                  ? mode === "endless"
                    ? "Místnost hotová"
                    : "Místnost drží"
                  : hud.loseReason === "budget"
                    ? "Došly otočky"
                    : "Špatný směr"}
              </h3>
              {won ? (
                <p className="mt-3 font-mono text-sm text-muted">
                  {hud.switches} otoček
                  {mode === "endless" ? (
                    <span className="text-ball"> · série {streak + 1}</span>
                  ) : newBest ? (
                    <span className="text-ball"> · nový rekord</span>
                  ) : null}
                  {mode === "campaign" ? <span className="text-subtle"> · par {level.par}</span> : null}
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  {mode === "endless"
                    ? `Série končí na ${streak}. ${hud.loseReason === "budget" ? "Rozpočet je pryč." : "Koule spadla do jámy."}`
                    : hud.loseReason === "budget"
                      ? "Další stisk už nebyl v rozpočtu."
                      : "Koule spadla do jámy."}
                </p>
              )}
              <div className="mt-6 flex flex-col gap-2">
                {won && (mode === "endless" || !lastCampaign) && (
                  <Button onClick={onNext} size="lg">
                    {mode === "endless" ? "Další místnost" : "Další místnost"}
                  </Button>
                )}
                {won && lastCampaign && (
                  <Button onClick={onMenu} size="lg">
                    Zpět na výběr
                  </Button>
                )}
                <Button
                  variant={won ? "outline" : "default"}
                  onClick={onRestart}
                  size="lg"
                >
                  {mode === "endless" ? (lost ? "Nový běh" : "Nový běh") : "Znovu"}
                </Button>
                {!(won && lastCampaign) && (
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
        <GravitySwitchButton
          gravityIndex={hud.gravityIndex}
          disabled={hud.status !== "playing"}
          onSwitch={onSwitch}
        />
      </div>
    </div>
  );
}

function GravitySwitchButton({
  gravityIndex,
  disabled,
  onSwitch,
}: {
  gravityIndex: number;
  disabled: boolean;
  onSwitch: () => void;
}) {
  const next = GRAVITY_DIRS[(gravityIndex + 1) % GRAVITY_DIRS.length];
  const [deg, setDeg] = useState(HEADING[next.id]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setDeg((d) => (reduced ? HEADING[next.id] : unwrapDeg(d, HEADING[next.id])));
  }, [next.id]);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSwitch();
      }}
      disabled={disabled}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-ball text-base font-semibold text-bg transition-[opacity,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.98] disabled:opacity-40",
      )}
    >
      <span
        className="grid size-8 place-items-center"
        style={{
          transform: `rotate(${deg}deg)`,
          transition: "transform var(--motion-spin) var(--ease-out)",
        }}
      >
        <ArrowUp className="size-5" strokeWidth={2.4} />
      </span>
      Přepnout · {next.label}
    </button>
  );
}

function MuteButton({ muted, onClick }: { muted: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onClick}
      aria-label={muted ? "Zapnout zvuk" : "Ztlumit zvuk"}
    >
      {muted ? <VolumeX /> : <Volume2 />}
    </Button>
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
