import { useMemo } from "preact/hooks";
import { Board } from "teeko-cc-common/src/model";
import { Move, generateMoves } from "./bot";

// Returns sorted moves when enabled and DB is loaded (caller ensures dbLoaded)
export function useAnalysis(board: Board, enabled: boolean): Move[] {
  return useMemo(() => {
    if (!enabled) return [];
    return generateMoves(board).sort((a, b) => b.score - a.score);
  }, [board.a, board.b, board.m.length, enabled]);
}
