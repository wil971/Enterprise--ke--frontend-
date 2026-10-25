export const GRID_SIZE = 20;

export type Point = { x: number; y: number };
export type Direction = "up" | "down" | "left" | "right";
export type GameStatus = "ready" | "running" | "paused" | "over";

export type GameState = {
  snake: Point[];
  direction: Direction;
  food: Point;
  score: number;
};

export const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function isOpposite(a: Direction, b: Direction) {
  return OPPOSITE[a] === b;
}

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

export function randomFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 };
}

export function createInitialState(): GameState {
  const mid = Math.floor(GRID_SIZE / 2);
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  return { snake, direction: "right", food: randomFood(snake), score: 0 };
}

export type StepResult = { state: GameState; ate: boolean; dead: boolean };

export function step(state: GameState, direction: Direction): StepResult {
  const vector = DIRECTION_VECTORS[direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };

  const hitWall =
    nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= GRID_SIZE || nextHead.y >= GRID_SIZE;
  const ate = samePoint(nextHead, state.food);
  // When not eating, the tail moves away this tick, so the head may enter its cell.
  const body = ate ? state.snake : state.snake.slice(0, -1);
  const hitSelf = body.some((p) => samePoint(p, nextHead));

  if (hitWall || hitSelf) {
    return { state: { ...state, direction }, ate: false, dead: true };
  }

  const snake = [nextHead, ...body];
  return {
    state: {
      snake,
      direction,
      food: ate ? randomFood(snake) : state.food,
      score: ate ? state.score + 1 : state.score,
    },
    ate,
    dead: false,
  };
}

export function tickDelay(score: number) {
  return Math.max(55, 140 - score * 4);
}
