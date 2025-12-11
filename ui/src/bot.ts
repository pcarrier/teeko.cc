import {
  Board,
  WINNING_POSITIONS,
  NEIGHS_BY_POSITION,
} from "teeko-cc-common/src/model.js";

const DB_URL = "/assets/db";
const EDGE = 5;
const SIZE = EDGE * EDGE;

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "perfect";
export type BotPlayer = "a" | "b";

type Move = { from?: number; to: number; score: number };

// Precomputed values for Goedel numbering
const patterns = [1, 1, 2, 3, 6, 10, 20, 35, 70];
const positions = [1, 25, 300, 2300, 12650, 53130, 177100, 480700, 1081575];
const configs = patterns.map((p, i) => p * positions[i]);

// Pascal's triangle for combinations
const choose: number[][] = Array.from({ length: 32 }, () => Array(32).fill(0));
for (let n = 0; n < 32; n++) {
  choose[n][0] = 1;
  choose[n][n] = 1;
  for (let k = 1; k < n; k++) {
    choose[n][k] = choose[n - 1][k - 1] + choose[n - 1][k];
  }
}

function popcount(n: number): number {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

// Goedel numbering - encode (a, b) position to index
function goedel(a: number, b: number, n: number): number {
  if (n === 0) return 0;

  const ab = a | b;
  let posNum = 0,
    patNum = 0;
  let pat = 0;
  let patBit = 1 << (n - 1);
  let nRed = Math.floor((n + 1) / 2);

  for (let j = 0; j < SIZE; j++) {
    const remaining = popcount(ab >>> j);
    if (ab & (1 << j)) {
      if (b & (1 << j)) {
        pat |= patBit;
      }
      patBit >>>= 1;
      posNum += choose[SIZE - j - 1][remaining];
    }
  }

  for (let j = 0; j < n; j++) {
    if (pat & (1 << j)) {
      nRed--;
      patNum += choose[n - j - 1][nRed + 1];
    }
  }

  return posNum + positions[n] * patNum;
}

// Database state
let dbLoading: Promise<void> | null = null;
let dbLoaded = false;
const scores: Int8Array[] = [];

async function loadDatabase(): Promise<void> {
  if (dbLoaded) return;
  if (dbLoading) return dbLoading;

  dbLoading = (async () => {
    const response = await fetch(DB_URL);
    if (!response.ok)
      throw new Error(`Failed to fetch database: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const view = new DataView(buffer);

    // Verify header
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    if (magic !== "TEEK") throw new Error("Invalid database magic");
    const version = view.getUint32(4, true);
    if (version !== 1)
      throw new Error(`Unsupported database version: ${version}`);

    // Read scores for each piece count
    let offset = 8;
    for (let n = 0; n < 9; n++) {
      const size = view.getUint32(offset, true);
      offset += 4;
      if (size !== configs[n])
        throw new Error(`Size mismatch for ${n} pieces`);
      scores[n] = new Int8Array(buffer, offset, size);
      offset += size;
    }

    dbLoaded = true;
  })();

  return dbLoading;
}

function generateMoves(board: Board): Move[] {
  const a = board.a;
  const b = board.b;
  const n = popcount(a) + popcount(b);
  const aTurn = board.m.length % 2 === 0;
  const [mover, other] = aTurn ? [a, b] : [b, a];
  const ab = a | b;
  const moves: Move[] = [];

  if (n === 8) {
    // Play phase - move pieces
    const table = scores[8];
    for (let sq = 0; sq < SIZE; sq++) {
      if (!(mover & (1 << sq))) continue;
      const piece = 1 << sq;
      const newMover = mover ^ piece;
      const dests = NEIGHS_BY_POSITION[sq] & ~ab;
      for (let dest = 0; dest < SIZE; dest++) {
        if (!(dests & (1 << dest))) continue;
        const ng = goedel(other, newMover | (1 << dest), 8);
        const ms = -table[ng];
        moves.push({ from: sq, to: dest, score: ms });
      }
    }
  } else {
    // Drop phase - place new pieces
    const next = scores[n + 1];
    for (let sq = 0; sq < SIZE; sq++) {
      if (ab & (1 << sq)) continue;
      const ng = goedel(other, mover | (1 << sq), n + 1);
      const ms = -next[ng];
      moves.push({ to: sq, score: ms });
    }
  }

  return moves;
}

function weightedRandom(moves: Move[], bias = 1): Move {
  if (moves.length === 1) return moves[0];
  const weights = moves.map((_, i) => Math.pow(moves.length - i, bias));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < moves.length; i++) {
    r -= weights[i];
    if (r <= 0) return moves[i];
  }
  return moves[moves.length - 1];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function selectMove(moves: Move[], difficulty: Difficulty): Move {
  if (moves.length === 0) throw new Error("No moves available");
  const sorted = shuffle([...moves]).sort((m1, m2) => m2.score - m1.score);

  const missBlunders =
    (difficulty === "beginner" && Math.random() < 0.25) ||
    (difficulty === "easy" && Math.random() < 0.1);
  const dominated = sorted.filter((m) => {
    if (m.score <= -125) {
      if (missBlunders) return true;
      if (difficulty === "beginner" || difficulty === "easy") return false;
      return false;
    }
    if (m.score <= -123 && difficulty === "hard") {
      return false;
    }
    return true;
  });
  const candidates = dominated.length > 0 ? dominated : sorted;

  switch (difficulty) {
    case "perfect":
      return candidates[0];
    case "hard":
      return weightedRandom(
        candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.1))),
        5
      );
    case "medium":
      return weightedRandom(
        candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.1))),
        4
      );
    case "easy":
      return weightedRandom(
        candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.2))),
        3
      );
    case "beginner":
      return weightedRandom(
        sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.3))),
        2
      );
    default:
      return candidates[0];
  }
}

export function isGameOver(board: Board): boolean {
  return WINNING_POSITIONS.has(board.a) || WINNING_POSITIONS.has(board.b);
}

export async function getBotMove(
  board: Board,
  difficulty: Difficulty
): Promise<{ from?: number; to: number } | null> {
  if (isGameOver(board)) return null;

  try {
    await loadDatabase();
    const moves = generateMoves(board);
    if (moves.length === 0) return null;
    const move = selectMove(moves, difficulty);
    return { from: move.from, to: move.to };
  } catch (e) {
    console.error("Failed to get bot move:", e);
    return null;
  }
}
