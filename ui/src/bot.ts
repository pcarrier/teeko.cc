import { Board, pieces, WINNING_POSITIONS } from "teeko-cc-common/src/model.js";

const SOLUTION_API = "https://solution.teeko.cc/query";

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "perfect";
export type BotPlayer = "a" | "b";

type Move = { from?: number; to: number; score: number };

type SolutionResponse = {
  moves: Move[];
  error?: string;
};

async function fetchMoves(board: Board, retries = 3): Promise<SolutionResponse> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(SOLUTION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          a: [...pieces(board.a)],
          b: [...pieces(board.b)],
          turn: board.m.length % 2 === 0 ? "a" : "b",
        }),
      });
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
  throw new Error("Failed after retries");
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
  const sorted = shuffle([...moves]).sort((a, b) => b.score - a.score);

  switch (difficulty) {
    case "perfect":
      return sorted[0];
    case "hard":
      return weightedRandom(sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.1))), 2);
    case "medium":
      return weightedRandom(sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.3))));
    case "easy":
      return weightedRandom(sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.6))), 0.5);
    case "beginner":
      return weightedRandom(sorted, 2);
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
    const response = await fetchMoves(board);
    if (response.error || !response.moves?.length) return null;
    const move = selectMove(response.moves, difficulty);
    return { from: move.from, to: move.to };
  } catch (e) {
    console.error("Failed to get bot move:", e);
    return null;
  }
}
