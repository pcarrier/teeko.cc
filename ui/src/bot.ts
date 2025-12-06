import { Board, pieces, WINNING_POSITIONS } from "teeko-cc-common/src/model.js";

const SOLUTION_API = "https://solution.teeko.cc/query";

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "perfect";
export type BotPlayer = "a" | "b";

type Move = { from?: number; to: number; score: number };

type SolutionResponse = {
  moves: Move[];
  error?: string;
};

async function fetchMoves(board: Board): Promise<SolutionResponse> {
  const response = await fetch(SOLUTION_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      a: [...pieces(board.a)],
      b: [...pieces(board.b)],
      turn: board.m.length % 2 === 0 ? "a" : "b",
    }),
  });
  return response.json();
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

function selectMove(moves: Move[], difficulty: Difficulty): Move {
  if (moves.length === 0) throw new Error("No moves available");
  const sorted = [...moves].sort((a, b) => b.score - a.score);

  switch (difficulty) {
    case "perfect":
      return sorted[0];
    case "hard":
      return weightedRandom(sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2))));
    case "medium":
      return weightedRandom(sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.5))));
    case "easy":
      return weightedRandom(sorted, 0.5);
    case "beginner":
      return sorted[Math.floor(Math.random() * sorted.length)];
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
