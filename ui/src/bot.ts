import {
  Board,
  WINNING_POSITIONS,
  NEIGHS_BY_POSITION,
} from "teeko-cc-common/src/model.js";

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "perfect";
export type BotPlayer = "a" | "b";

const SIZE = 25;
const positions = new Uint32Array([1, 25, 300, 2300, 12650, 53130, 177100, 480700, 1081575]);
const configs = [1, 1, 2, 3, 6, 10, 20, 35, 70].map((p, i) => p * positions[i]);

// Flattened choose table: choose[n][k] -> chooseFlat[n << 5 | k]
const chooseFlat = new Uint32Array(32 << 5);
for (let n = 0; n < 32; n++) {
  chooseFlat[n << 5] = chooseFlat[n << 5 | n] = 1;
  for (let k = 1; k < n; k++) chooseFlat[n << 5 | k] = chooseFlat[(n - 1) << 5 | (k - 1)] + chooseFlat[(n - 1) << 5 | k];
}

// Precomputed popcount for 8-bit values
const popcount8 = new Uint8Array(256);
for (let i = 1; i < 256; i++) popcount8[i] = (i & 1) + popcount8[i >> 1];

// Precomputed 1 << j
const bit = new Uint32Array(32);
for (let i = 0; i < 32; i++) bit[i] = 1 << i;

function popcount(n: number): number {
  return popcount8[n & 255] + popcount8[(n >> 8) & 255] + popcount8[(n >> 16) & 255] + popcount8[n >>> 24];
}

function goedel(a: number, b: number, n: number): number {
  if (n === 0) return 0;
  const ab = a | b;
  let posNum = 0, patNum = 0, pat = 0, patBit = bit[n - 1], nRed = (n + 1) >> 1;

  for (let j = 0; j < SIZE; j++) {
    const bj = bit[j];
    if (ab & bj) {
      if (b & bj) pat |= patBit;
      patBit >>>= 1;
      posNum += chooseFlat[(24 - j) << 5 | popcount(ab >>> j)];
    }
  }
  for (let j = 0; j < n; j++) {
    if (pat & bit[j]) patNum += chooseFlat[(n - j - 1) << 5 | (nRed--)];
  }
  return posNum + positions[n] * patNum;
}

// Database
let dbLoading: Promise<void> | null = null;
let dbLoaded = false;
const scores: Int8Array[] = [];
const progressListeners: Set<(p: number) => void> = new Set();
let progress = 0;

function notify(p: number) {
  progress = p;
  for (const l of progressListeners) l(p);
}

export function onDbProgress(listener: (p: number) => void): () => void {
  loadDatabase();
  listener(dbLoaded ? 1 : progress);
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

const DB_SIZE = 96691520;

async function loadDatabase(): Promise<void> {
  if (dbLoaded || dbLoading) return dbLoading ?? undefined;

  dbLoading = (async () => {
    notify(0);
    const res = await fetch("/assets/db");
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

    let buffer: ArrayBuffer;
    if (res.body) {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        notify(received / DB_SIZE);
      }
      const combined = new Uint8Array(received);
      let pos = 0;
      for (const c of chunks) { combined.set(c, pos); pos += c.length; }
      buffer = combined.buffer;
    } else {
      buffer = await res.arrayBuffer();
      notify(1);
    }

    const view = new DataView(buffer);
    const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (magic !== "TEEK") throw new Error("Invalid database");
    if (view.getUint32(4, true) !== 1) throw new Error("Unsupported version");

    let offset = 8;
    for (let n = 0; n < 9; n++) {
      const size = view.getUint32(offset, true);
      offset += 4;
      if (size !== configs[n]) throw new Error(`Size mismatch for ${n} pieces`);
      scores[n] = new Int8Array(buffer, offset, size);
      offset += size;
    }
    dbLoaded = true;
  })();

  return dbLoading;
}

function generateMoves(board: Board): { from?: number; to: number; score: number }[] {
  const { a, b, m } = board;
  const n = popcount(a) + popcount(b);
  const [mover, other] = m.length % 2 === 0 ? [a, b] : [b, a];
  const ab = a | b;
  const moves: { from?: number; to: number; score: number }[] = [];

  if (n === 8) {
    for (let sq = 0; sq < SIZE; sq++) {
      if (!(mover & (1 << sq))) continue;
      const newMover = mover ^ (1 << sq);
      for (let dest = 0; dest < SIZE; dest++) {
        if (!(NEIGHS_BY_POSITION[sq] & ~ab & (1 << dest))) continue;
        moves.push({ from: sq, to: dest, score: -scores[8][goedel(other, newMover | (1 << dest), 8)] });
      }
    }
  } else {
    for (let sq = 0; sq < SIZE; sq++) {
      if (ab & (1 << sq)) continue;
      moves.push({ to: sq, score: -scores[n + 1][goedel(other, mover | (1 << sq), n + 1)] });
    }
  }
  return moves;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function weightedRandom<T>(arr: T[], bias: number): T {
  if (arr.length === 1) return arr[0];
  let total = 0;
  const weights = arr.map((_, i) => { const w = Math.pow(arr.length - i, bias); total += w; return w; });
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) if ((r -= weights[i]) <= 0) return arr[i];
  return arr[arr.length - 1];
}

function selectMove(moves: { from?: number; to: number; score: number }[], difficulty: Difficulty) {
  const sorted = shuffle([...moves]).sort((a, b) => b.score - a.score);

  if (difficulty === "perfect") return sorted[0];

  const missBlunders = (difficulty === "beginner" && Math.random() < 0.25) || (difficulty === "easy" && Math.random() < 0.1);
  const dominated = sorted.filter((m) => {
    if (m.score <= -125) return missBlunders;
    if (m.score <= -123 && difficulty === "hard") return false;
    return true;
  });
  const candidates = dominated.length ? dominated : sorted;

  switch (difficulty) {
    case "hard":
      return weightedRandom(candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.1))), 5);
    case "medium":
      return weightedRandom(candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.1))), 4);
    case "easy":
      return weightedRandom(candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.2))), 3);
    case "beginner":
      return weightedRandom(sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.3))), 2);
    default:
      return sorted[0];
  }
}

export function isGameOver(board: Board): boolean {
  return WINNING_POSITIONS.has(board.a) || WINNING_POSITIONS.has(board.b);
}

export async function getBotMove(board: Board, difficulty: Difficulty): Promise<{ from?: number; to: number } | null> {
  if (isGameOver(board)) return null;
  try {
    await loadDatabase();
    const moves = generateMoves(board);
    if (!moves.length) return null;
    const { from, to } = selectMove(moves, difficulty);
    return { from, to };
  } catch (e) {
    console.error("Bot move failed:", e);
    return null;
  }
}
