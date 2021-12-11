export const SIZE = 5;
export const SLOTS = SIZE * SIZE;

export enum Player {
  A,
  B,
}

export type Board = {
  a: number;
  b: number;
  t: number; // turn
  p: boolean; // playing
  l: number | [number, number] | null; // last action
};

export const EmptyBoard: Board = {
  a: 0,
  b: 0,
  t: Player.A,
  p: true,
  l: null,
};

export function pieces(n: number): Set<number> {
  const result = [];
  for (let i = 0; i < SLOTS; i++) {
    if (n & 1) result.push(i);
    n >>= 1;
  }
  return new Set(result);
}

// From north clockwise
export const DIRECTIONS: number[] = [-5, -4, 1, 6, 5, 4, -1, -6];

export const DELTA_TO_DIRECTIONS: Record<number, number> = {
  [-5]: 0,
  [-4]: 1,
  [1]: 2,
  [6]: 3,
  [5]: 4,
  [4]: 5,
  [-1]: 6,
  [-6]: 7,
};

type Delta = {
  dx: number;
  dy: number;
};

export const DIRECTION_TO_DELTAS: Delta[] = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
];
