import { useEffect, useMemo, useState } from "preact/hooks";
import { Board } from "teeko-cc-common/src/model";
import { Move, generateMoves, isDbLoaded, loadDatabase } from "./bot";

export function useAnalysis(
  board: Board,
  enabled: boolean
): { moves: Move[]; loading: boolean } {
  const [dbReady, setDbReady] = useState(isDbLoaded());
  const [loading, setLoading] = useState(false);

  // Load database if needed
  useEffect(() => {
    if (!enabled || dbReady) return;

    let cancelled = false;
    setLoading(true);

    loadDatabase().then(() => {
      if (!cancelled) {
        setDbReady(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, dbReady]);

  // Compute moves synchronously when DB is ready
  const moves = useMemo(() => {
    if (!enabled || !dbReady) return [];
    return generateMoves(board).sort((a, b) => b.score - a.score);
  }, [board.a, board.b, board.m.length, enabled, dbReady]);

  return { moves, loading };
}
