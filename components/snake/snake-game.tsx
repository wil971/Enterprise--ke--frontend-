"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import {
  GRID_SIZE,
  createInitialState,
  isOpposite,
  step,
  tickDelay,
  type Direction,
  type GameState,
  type GameStatus,
} from "./game-logic";
import styles from "./snake.module.css";

const BOARD_PIXELS = 480;
const CELL = BOARD_PIXELS / GRID_SIZE;
const HIGH_SCORE_KEY = "snake-high-score";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

function draw(ctx: CanvasRenderingContext2D, game: GameState) {
  ctx.fillStyle = "#0a101b";
  ctx.fillRect(0, 0, BOARD_PIXELS, BOARD_PIXELS);

  ctx.fillStyle = "#111b2b";
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }

  const { food } = game;
  ctx.fillStyle = "#ff6b81";
  ctx.shadowColor = "#ff6b81";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const length = game.snake.length;
  game.snake.forEach((segment, index) => {
    const fade = 1 - (index / Math.max(length, 1)) * 0.55;
    ctx.fillStyle = index === 0 ? "#7cf2c4" : `rgba(64, 214, 160, ${fade})`;
    const inset = index === 0 ? 1.5 : 2.5;
    ctx.beginPath();
    ctx.roundRect(
      segment.x * CELL + inset,
      segment.y * CELL + inset,
      CELL - inset * 2,
      CELL - inset * 2,
      6,
    );
    ctx.fill();
  });

  const head = game.snake[0];
  ctx.fillStyle = "#070b12";
  const eyeOffset = CELL * 0.2;
  const cx = head.x * CELL + CELL / 2;
  const cy = head.y * CELL + CELL / 2;
  const horizontal = game.direction === "left" || game.direction === "right";
  const forward = (game.direction === "right" || game.direction === "down" ? 1 : -1) * CELL * 0.15;
  const eyes = horizontal
    ? [
        [cx + forward, cy - eyeOffset],
        [cx + forward, cy + eyeOffset],
      ]
    : [
        [cx - eyeOffset, cy + forward],
        [cx + eyeOffset, cy + forward],
      ];
  for (const [ex, ey] of eyes) {
    ctx.beginPath();
    ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const directionQueue = useRef<Direction[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const [status, setStatus] = useState<GameStatus>("ready");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const render = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && gameRef.current) draw(ctx, gameRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = BOARD_PIXELS * dpr;
    canvas.height = BOARD_PIXELS * dpr;
    canvas.getContext("2d")?.scale(dpr, dpr);
    gameRef.current = createInitialState();
    render();
    const stored = Number(window.localStorage.getItem(HIGH_SCORE_KEY));
    if (Number.isFinite(stored)) setHighScore(stored);
  }, [render]);

  const start = useCallback(() => {
    gameRef.current = createInitialState();
    directionQueue.current = [];
    setScore(0);
    setStatus("running");
    render();
  }, [render]);

  const queueDirection = useCallback((direction: Direction) => {
    const game = gameRef.current;
    if (!game) return;
    const queue = directionQueue.current;
    const last = queue[queue.length - 1] ?? game.direction;
    if (direction === last || isOpposite(direction, last) || queue.length >= 2) return;
    queue.push(direction);
  }, []);

  const handleDirection = useCallback(
    (direction: Direction) => {
      if (status === "ready" || status === "over") start();
      if (status === "paused") setStatus("running");
      queueDirection(direction);
    },
    [queueDirection, start, status],
  );

  const togglePause = useCallback(() => {
    if (status === "running") setStatus("paused");
    else if (status === "paused") setStatus("running");
    else start();
  }, [start, status]);

  useEffect(() => {
    if (status !== "running") return;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const game = gameRef.current;
      if (!game) return;
      const nextDirection = directionQueue.current.shift() ?? game.direction;
      const result = step(game, nextDirection);
      gameRef.current = result.state;
      render();

      if (result.dead) {
        setStatus("over");
        setHighScore((prev) => {
          const best = Math.max(prev, result.state.score);
          window.localStorage.setItem(HIGH_SCORE_KEY, String(best));
          return best;
        });
        return;
      }
      if (result.ate) setScore(result.state.score);
      timeout = setTimeout(tick, tickDelay(result.state.score));
    };

    timeout = setTimeout(tick, tickDelay(gameRef.current?.score ?? 0));
    return () => clearTimeout(timeout);
  }, [render, status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, input, a")) {
        if (event.key === " " || event.key === "Enter") return;
      }
      const direction = KEY_TO_DIRECTION[event.key] ?? KEY_TO_DIRECTION[event.key.toLowerCase()];
      if (direction) {
        event.preventDefault();
        handleDirection(direction);
      } else if (event.key === " " || event.key === "Escape" || event.key.toLowerCase() === "p") {
        event.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDirection, togglePause]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setStatus((s) => (s === "running" ? "paused" : s));
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const onTouchStart = (event: TouchEvent) => {
    const t = event.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    const origin = touchStart.current;
    touchStart.current = null;
    if (!origin) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - origin.x;
    const dy = t.clientY - origin.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) handleDirection(dx > 0 ? "right" : "left");
    else handleDirection(dy > 0 ? "down" : "up");
  };

  return (
    <section className={styles.game} aria-label="Snake game">
      <div className={styles.scoreboard}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Score</div>
          <div className={styles.statValue} aria-live="polite">
            {score}
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Best</div>
          <div className={styles.statValue}>{highScore}</div>
        </div>
      </div>

      <div className={styles.board} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          role="img"
          aria-label={`Snake board. Length ${score + 3}. Status: ${status}.`}
        />
        {status !== "running" && (
          <div className={styles.overlay}>
            <h2 className={styles.overlayTitle}>
              {status === "ready" ? "Ready?" : status === "paused" ? "Paused" : "Game over"}
            </h2>
            <p className={styles.overlayText}>
              {status === "over"
                ? `You scored ${score}. ${score > 0 && score >= highScore ? "New best!" : "Try again?"}`
                : "Use the arrow keys, WASD, or swipe to steer."}
            </p>
            <button type="button" className={styles.button} onClick={status === "paused" ? togglePause : start}>
              {status === "ready" ? "Start game" : status === "paused" ? "Resume" : "Play again"}
            </button>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <span className={styles.hint}>Space or P to pause</span>
        <button
          type="button"
          className={styles.secondary}
          onClick={togglePause}
          disabled={status === "ready" || status === "over"}
        >
          {status === "paused" ? "Resume" : "Pause"}
        </button>
      </div>

      <div className={styles.pad} aria-label="Direction controls">
        <button type="button" className={`${styles.padButton} ${styles.padUp}`} onClick={() => handleDirection("up")} aria-label="Up">
          {"↑"}
        </button>
        <button type="button" className={`${styles.padButton} ${styles.padLeft}`} onClick={() => handleDirection("left")} aria-label="Left">
          {"←"}
        </button>
        <button type="button" className={`${styles.padButton} ${styles.padDown}`} onClick={() => handleDirection("down")} aria-label="Down">
          {"↓"}
        </button>
        <button type="button" className={`${styles.padButton} ${styles.padRight}`} onClick={() => handleDirection("right")} aria-label="Right">
          {"→"}
        </button>
      </div>
    </section>
  );
}
