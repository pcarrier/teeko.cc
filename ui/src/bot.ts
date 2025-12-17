import {
  Board,
  WINNING_POSITIONS,
  NEIGHS_BY_POSITION,
} from "teeko-cc-common/src/model.js";

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "perfect";
export type BotPlayer = "a" | "b";

const SIZE = 25;
const positions = new Uint32Array([
  1, 25, 300, 2300, 12650, 53130, 177100, 480700, 1081575,
]);
const configs = [1, 1, 2, 3, 6, 10, 20, 35, 70].map((p, i) => p * positions[i]);

// Flattened choose table: choose[n][k] -> chooseFlat[n << 5 | k]
const chooseFlat = new Uint32Array(32 << 5);
for (let n = 0; n < 32; n++) {
  chooseFlat[n << 5] = chooseFlat[(n << 5) | n] = 1;
  for (let k = 1; k < n; k++)
    chooseFlat[(n << 5) | k] =
      chooseFlat[((n - 1) << 5) | (k - 1)] + chooseFlat[((n - 1) << 5) | k];
}

// Precomputed popcount for 8-bit values
const popcount8 = new Uint8Array(256);
for (let i = 1; i < 256; i++) popcount8[i] = (i & 1) + popcount8[i >> 1];

// Precomputed 1 << j
const bit = new Uint32Array(32);
for (let i = 0; i < 32; i++) bit[i] = 1 << i;

function popcount(n: number): number {
  return (
    popcount8[n & 255] +
    popcount8[(n >> 8) & 255] +
    popcount8[(n >> 16) & 255] +
    popcount8[n >>> 24]
  );
}

function goedel(a: number, b: number, n: number): number {
  if (n === 0) return 0;
  const ab = a | b;
  let posNum = 0,
    patNum = 0,
    pat = 0,
    patBit = bit[n - 1],
    nRed = (n + 1) >> 1;

  for (let j = 0; j < SIZE; j++) {
    const bj = bit[j];
    if (ab & bj) {
      if (b & bj) pat |= patBit;
      patBit >>>= 1;
      posNum += chooseFlat[((24 - j) << 5) | popcount(ab >>> j)];
    }
  }
  for (let j = 0; j < n; j++) {
    if (pat & bit[j]) patNum += chooseFlat[((n - j - 1) << 5) | nRed--];
  }
  return posNum + positions[n] * patNum;
}

const patterns = [1, 1, 2, 3, 6, 10, 20, 35, 70];

function degoedel(idx: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  let patNum = Math.floor(idx / positions[n]);
  let posNum = idx % positions[n];

  // Decode pattern
  let patWalk = patterns[n];
  let pat = 0;
  let nRed = (n + 1) >> 1;
  for (let j = 0; j < n; j++) {
    const pcs = n - j;
    const temp = Math.floor((patWalk * (pcs - nRed)) / pcs);
    if (patNum >= temp) {
      patNum -= temp;
      patWalk = Math.floor((patWalk * nRed) / pcs);
      nRed--;
      pat |= 1 << j;
    } else {
      patWalk = temp;
    }
  }

  // Decode position
  let posWalk = positions[n];
  let pcs = n;
  let patBit = bit[n - 1];
  let a = 0,
    b = 0;
  for (let j = 0; j < SIZE; j++) {
    const locs = SIZE - j;
    const temp = Math.floor((posWalk * (locs - pcs)) / locs);
    if (posNum >= temp) {
      posNum -= temp;
      posWalk = Math.floor((posWalk * pcs) / locs);
      pcs--;
      if (pat & patBit) {
        b |= 1 << j;
      } else {
        a |= 1 << j;
      }
      patBit >>>= 1;
    } else {
      posWalk = temp;
    }
  }
  return [a, b];
}

// D4 symmetry transformation tables (8 symmetries of the square)
const SYM_TABLES: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], // identity
  [20, 15, 10, 5, 0, 21, 16, 11, 6, 1, 22, 17, 12, 7, 2, 23, 18, 13, 8, 3, 24, 19, 14, 9, 4], // rot90 CCW
  [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], // rot180
  [4, 9, 14, 19, 24, 3, 8, 13, 18, 23, 2, 7, 12, 17, 22, 1, 6, 11, 16, 21, 0, 5, 10, 15, 20], // rot270 CCW
  [4, 3, 2, 1, 0, 9, 8, 7, 6, 5, 14, 13, 12, 11, 10, 19, 18, 17, 16, 15, 24, 23, 22, 21, 20], // flip H
  [20, 21, 22, 23, 24, 15, 16, 17, 18, 19, 10, 11, 12, 13, 14, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4], // flip V
  [0, 5, 10, 15, 20, 1, 6, 11, 16, 21, 2, 7, 12, 17, 22, 3, 8, 13, 18, 23, 4, 9, 14, 19, 24], // reflect main diagonal
  [24, 19, 14, 9, 4, 23, 18, 13, 8, 3, 22, 17, 12, 7, 2, 21, 16, 11, 6, 1, 20, 15, 10, 5, 0], // reflect anti-diagonal
];

const BLOCK_SIZE = 1024;

function transformMask(mask: number, sym: number): number {
  let result = 0;
  for (let i = 0; i < 25; i++) {
    if (mask & (1 << i)) result |= 1 << SYM_TABLES[sym][i];
  }
  return result;
}

function canonical(a: number, b: number, n: number): number {
  let minG = goedel(a, b, n);
  for (let s = 1; s < 8; s++) {
    const g = goedel(transformMask(a, s), transformMask(b, s), n);
    if (g < minG) minG = g;
  }
  return minG;
}

function isCanonical(g: number, n: number): boolean {
  const [a, b] = degoedel(g, n);
  return canonical(a, b, n) === g;
}

function rankQuery(n: number, canonG: number): number {
  const blockIdx = Math.floor(canonG / BLOCK_SIZE);
  let rank = checkpoints[n][blockIdx];
  for (let g = blockIdx * BLOCK_SIZE; g < canonG; g++) {
    if (isCanonical(g, n)) rank++;
  }
  return rank;
}

function lookupScoreV2(a: number, b: number, n: number): number {
  const canonG = canonical(a, b, n);
  return canonicalScores[n][rankQuery(n, canonG)];
}

// Database
let checkpoints: Int32Array[] = [];
let canonicalScores: Int8Array[] = [];
let dbVersion = 0;
let dbLoading: Promise<void> | null = null;
let dbLoaded = false;
const scores: Int8Array[] = [];
const progressListeners: Set<(p: number | undefined) => void> = new Set();
let progress: number | undefined = undefined;

function notify(p: number) {
  progress = p;
  for (const l of progressListeners) l(p);
}

export function onDbProgress(
  listener: (p: number | undefined) => void
): () => void {
  listener(dbLoaded ? 1 : progress);
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

export function startDbLoad(): void {
  loadDatabase();
}

async function loadDatabase(): Promise<void> {
  if (dbLoaded || dbLoading) return dbLoading ?? undefined;

  dbLoading = (async () => {
    notify(0);
    const res = await fetch("/assets/db2");
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

    // Get content length for progress
    const contentLength = res.headers.get("content-length");
    const totalSize = contentLength ? parseInt(contentLength, 10) : 0;

    let buffer: ArrayBuffer;
    if (res.body && totalSize > 0) {
      // Stream with progress
      const data = new Uint8Array(totalSize);
      const reader = res.body.getReader();
      let received = 0;
      let lastPct = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        data.set(value, received);
        received += value.length;
        const pct = Math.floor((received / totalSize) * 100);
        if (pct > lastPct) {
          notify(received / totalSize);
          lastPct = pct;
        }
      }
      buffer = data.buffer;
    } else {
      // Fallback
      buffer = await res.arrayBuffer();
    }

    const view = new DataView(buffer);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    if (magic !== "TEEK") throw new Error("Invalid database");

    dbVersion = view.getUint32(4, true);
    let offset = 8;

    if (dbVersion === 1) {
      // V1 format: full score tables
      for (let n = 0; n < 9; n++) {
        const size = view.getUint32(offset, true);
        offset += 4;
        if (size !== configs[n])
          throw new Error(`Size mismatch for ${n} pieces`);
        scores[n] = new Int8Array(buffer, offset, size);
        offset += size;
      }
    } else if (dbVersion === 2) {
      // V2 format: canonical positions with checkpoints
      for (let n = 0; n < 9; n++) {
        const canonCount = view.getUint32(offset, true);
        offset += 4;
        const numCheckpoints = view.getUint32(offset, true);
        offset += 4;

        // Read checkpoints
        checkpoints[n] = new Int32Array(numCheckpoints);
        for (let i = 0; i < numCheckpoints; i++) {
          checkpoints[n][i] = view.getUint32(offset, true);
          offset += 4;
        }

        // Read scores
        canonicalScores[n] = new Int8Array(buffer, offset, canonCount);
        offset += canonCount;
      }
    } else {
      throw new Error(`Unsupported version: ${dbVersion}`);
    }

    dbLoaded = true;
    notify(1);
  })();

  return dbLoading;
}

export type Move = { from?: number; to: number; score: number };

// Heuristic range for drawn positions
// ±81 to ±126 are reserved for forced wins (up to 45 moves)
const HEURISTIC_MAX = 80;

// Convert raw database score to number of moves to win/lose
// Returns positive number = moves to outcome (1 = win/lose this move)
// For heuristic scores (-80 to +80), returns null (no forced outcome)
// Use raw score sign to determine if winning (>0) or losing (<0)
export function formatScore(rawScore: number): number | null {
  if (rawScore > HEURISTIC_MAX) {
    // Win: 126 = win in 1 move, 125 = win in 2, etc.
    return 127 - rawScore;
  } else if (rawScore < -HEURISTIC_MAX) {
    // Loss: -126 = lose in 1 move, -125 = lose in 2, etc.
    return 127 + rawScore;
  }
  // Heuristic score - no forced outcome
  return null;
}

// Check if a score represents a forced win/loss (not just heuristic)
export function isForced(score: number): boolean {
  return score > HEURISTIC_MAX || score < -HEURISTIC_MAX;
}

// Get score for a position, handling both v1 and v2 formats
function getScore(a: number, b: number, n: number): number {
  if (dbVersion === 2) {
    return lookupScoreV2(a, b, n);
  }
  return scores[n][goedel(a, b, n)];
}

export function generateMoves(board: Board): Move[] {
  if (!dbLoaded) return [];
  const { a, b, m } = board;
  const n = popcount(a) + popcount(b);
  const [mover, other] = m.length % 2 === 0 ? [a, b] : [b, a];
  const ab = a | b;
  const moves: Move[] = [];

  if (n === 8) {
    for (let sq = 0; sq < SIZE; sq++) {
      if (!(mover & (1 << sq))) continue;
      const newMover = mover ^ (1 << sq);
      for (let dest = 0; dest < SIZE; dest++) {
        if (!(NEIGHS_BY_POSITION[sq] & ~ab & (1 << dest))) continue;
        moves.push({
          from: sq,
          to: dest,
          score: -getScore(other, newMover | (1 << dest), 8),
        });
      }
    }
  } else {
    for (let sq = 0; sq < SIZE; sq++) {
      if (ab & (1 << sq)) continue;
      moves.push({
        to: sq,
        score: -getScore(other, mover | (1 << sq), n + 1),
      });
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
  const weights = arr.map((_, i) => {
    const w = Math.pow(arr.length - i, bias);
    total += w;
    return w;
  });
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++)
    if ((r -= weights[i]) <= 0) return arr[i];
  return arr[arr.length - 1];
}

export function isDbLoaded(): boolean {
  return dbLoaded;
}

export { loadDatabase };

function selectMove(moves: Move[], difficulty: Difficulty) {
  const sorted = shuffle([...moves]).sort((a, b) => b.score - a.score);

  if (difficulty === "perfect") return sorted[0];

  // Check if position has forced wins/losses (outside heuristic range)
  const hasForced = sorted.some(
    (m) => m.score > HEURISTIC_MAX || m.score < -HEURISTIC_MAX
  );

  const missBlunders =
    (difficulty === "beginner" && Math.random() < 0.3) ||
    (difficulty === "easy" && Math.random() < 0.2) ||
    (difficulty === "medium" && Math.random() < 0.1) ||
    (difficulty === "hard" && Math.random() < 0.05);

  // Filter out losing moves (forced losses)
  const dominated = sorted.filter((m) => {
    if (m.score < -HEURISTIC_MAX) return missBlunders;
    return true;
  });
  const candidates = dominated.length ? dominated : sorted;

  // For positions with only heuristic scores, lower difficulties play more randomly
  const heuristicRandomness = !hasForced
    ? {
        beginner: 0.7, // 70% chance to pick randomly
        easy: 0.5, // 50% chance
        medium: 0.2, // 20% chance
        hard: 0.05, // 5% chance
      }[difficulty] ?? 0
    : 0;

  if (Math.random() < heuristicRandomness) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  switch (difficulty) {
    case "hard":
      return weightedRandom(
        candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.2))),
        3
      );
    case "medium":
      return weightedRandom(
        candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.25))),
        2
      );
    case "easy":
      return weightedRandom(
        candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.3))),
        1
      );
    case "beginner":
      return weightedRandom(
        candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.5))),
        0.5
      );
    default:
      return sorted[0];
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
    if (!moves.length) return null;
    const { from, to } = selectMove(moves, difficulty);
    return { from, to };
  } catch (e) {
    console.error("Bot move failed:", e);
    return null;
  }
}
