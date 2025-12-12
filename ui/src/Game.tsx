import { FunctionComponent } from "preact";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { Text } from "preact-i18n";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faBackwardStep } from "@fortawesome/free-solid-svg-icons/faBackwardStep";
import { faRotateBack } from "@fortawesome/free-solid-svg-icons/faRotateBack";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons/faMagnifyingGlass";
import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";
import {
  Board,
  emptyBoard,
  computePlace,
  computeMove,
  computeReset,
  computeUndo,
  WINNING_POSITIONS,
} from "teeko-cc-common/src/model";
import { BoardView } from "./BoardView";
import { useAnalysis } from "./useAnalysis";
import { generateMoves, isDbLoaded } from "./bot";

type Move = number | [number, number];

const isGameOver = (board: Board) =>
  WINNING_POSITIONS.has(board.a) || WINNING_POSITIONS.has(board.b);

const formatMove = (m: Move) =>
  typeof m === "number" ? String(m + 1) : `${m[0] + 1}→${m[1] + 1}`;

function boardAtMove(moves: Move[], index: number): Board {
  let board = emptyBoard();
  for (let i = 0; i <= index; i++) {
    const m = moves[i];
    board =
      (typeof m === "number"
        ? computePlace(board, m)
        : computeMove(board, m[0], m[1])) ?? board;
  }
  return board;
}

function getMoveScore(board: Board, m: Move): number | null {
  if (!isDbLoaded()) return null;
  const moves = generateMoves(board);
  if (moves.length === 0) return null;

  const played = moves.find((mv) =>
    typeof m === "number"
      ? mv.from === undefined && mv.to === m
      : mv.from === m[0] && mv.to === m[1]
  );
  return played?.score ?? null;
}

// Threshold for forced win/loss (heuristics are in -50 to +50 range)
const FORCED_THRESHOLD = 50;

function isForced(score: number | null): boolean {
  return (
    score !== null && (score > FORCED_THRESHOLD || score < -FORCED_THRESHOLD)
  );
}

export const Game: FunctionComponent<{
  board: Board;
  roomPath?: string;
  moveToBoard: (board: Board) => void;
  disabled?: boolean;
  singleBotMode?: boolean;
  botSelection?: number;
  analysisUsed?: boolean;
  onAnalysisUsed?: () => void;
}> = ({
  board,
  roomPath,
  moveToBoard,
  disabled,
  singleBotMode,
  botSelection,
  analysisUsed,
  onAnalysisUsed,
}) => {
  const [analysisOn, setAnalysisOn] = useState(false);
  const [viewingMove, setViewingMove] = useState<number | null>(null);
  const [scores, setScores] = useState<(number | null)[]>([]);
  const moveListRef = useRef<HTMLOListElement>(null);

  const gameOver = isGameOver(board);
  const safeViewingMove =
    viewingMove !== null && viewingMove < board.m.length ? viewingMove : null;
  const viewingBoard = useMemo(
    () =>
      safeViewingMove !== null ? boardAtMove(board.m, safeViewingMove) : board,
    [safeViewingMove, board.a, board.b, board.m.length]
  );
  const { moves: analysisMoves } = useAnalysis(viewingBoard, analysisOn);

  const reportAnalysis = () => {
    if (analysisOn && onAnalysisUsed) onAnalysisUsed();
  };

  // Report if analysis is on when game resets
  const prevBoardA = useRef(board.a);
  useEffect(() => {
    const wasReset = prevBoardA.current !== 0 && board.a === 0;
    prevBoardA.current = board.a;
    if (wasReset) {
      reportAnalysis();
      setScores([]);
    }
  }, [board.a, analysisOn, onAnalysisUsed]);

  // Compute scores only when analysis is on
  useEffect(() => {
    if (!analysisOn) return;
    if (board.m.length === 0) {
      setScores([]);
      return;
    }
    setScores((prev) => {
      if (prev.length > board.m.length) return prev.slice(0, board.m.length);
      if (prev.length === board.m.length) return prev;

      // Compute all missing scores
      const newScores = [...prev];
      for (let i = prev.length; i < board.m.length; i++) {
        const move = board.m[i];
        const prevBoard = i === 0 ? emptyBoard() : boardAtMove(board.m, i - 1);
        newScores.push(getMoveScore(prevBoard, move));
      }
      return newScores;
    });
  }, [analysisOn, board.m.length]);

  const isForcedMove = (index: number) => isForced(scores[index]);

  // Reset viewing position when board changes
  useEffect(() => {
    setViewingMove(null);
  }, [board.m.length]);

  // Autoscroll move list to end if already at end
  const wasAtEnd = useRef(true);
  useLayoutEffect(() => {
    const el = moveListRef.current;
    if (el && wasAtEnd.current) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [board.m.length, analysisOn]);

  const onMoveListScroll = () => {
    const el = moveListRef.current;
    if (el) {
      wasAtEnd.current = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    }
  };

  const play = (after: Board | undefined) => {
    if (!after) return;
    if (roomPath) after.p = false;
    reportAnalysis();
    moveToBoard(after);
  };

  const move = (from: number, to: number) => {
    if (!disabled) play(computeMove(board, from, to));
  };

  const place = (pos: number) => {
    if (!disabled) play(computePlace(board, pos));
  };

  const undo = () => {
    let after = computeUndo(board);
    if (after && singleBotMode) after = computeUndo(after) ?? after;
    if (after && roomPath) after.p = !after.p;
    if (after) moveToBoard(after);
  };

  const classNames = (...classes: (string | false | undefined)[]) =>
    classes.filter(Boolean).join(" ") || undefined;

  const analysisButton = (selected: boolean) => (
    <button
      onClick={() => {
        setAnalysisOn(!analysisOn);
        if (!analysisOn) onAnalysisUsed?.();
      }}
      class={classNames(selected && "selected", analysisUsed && "used")}
    >
      <FontAwesomeIcon icon={faMagnifyingGlass} />{" "}
      <Text id="buttons.analysis" />
    </button>
  );

  const restart = () => {
    setViewingMove(null);
    setScores([]);
    moveToBoard(computeReset(board));
  };

  const restartButton = (
    <button onClick={restart} disabled={board.a === 0}>
      <FontAwesomeIcon icon={faRotateBack} /> <Text id="buttons.restart" />
    </button>
  );

  if (analysisOn) {
    return (
      <section class="game">
        <BoardView
          board={viewingBoard}
          place={gameOver ? () => {} : place}
          move={gameOver ? () => {} : move}
          klass="full"
          showStatus
          analysis={analysisMoves}
        />
        <ol class="moveHistory" ref={moveListRef} onScroll={onMoveListScroll}>
          {board.m.map((m, i) => (
            <li
              class={classNames(
                safeViewingMove === i && "selected",
                isForcedMove(i) && "forced"
              )}
              onClick={() => setViewingMove(i)}
            >
              {i + 1}. {formatMove(m)}
            </li>
          ))}
        </ol>
        <nav class="labeledButtons">
          {gameOver ? (
            <button
              onClick={() => setViewingMove(null)}
              disabled={safeViewingMove === null}
            >
              <FontAwesomeIcon icon={faPlay} /> <Text id="buttons.jumpBack" />
            </button>
          ) : (
            <button onClick={undo} disabled={board.m.length === 0}>
              <FontAwesomeIcon icon={faBackwardStep} />{" "}
              <Text id="buttons.undo" />
            </button>
          )}
          {restartButton}
          {analysisButton(true)}
        </nav>
      </section>
    );
  }

  return (
    <div class="game">
      <BoardView
        board={board}
        place={place}
        move={move}
        klass="full"
        showStatus
        botSelection={botSelection}
      />
      <div class="labeledButtons">
        <button onClick={undo} disabled={board.m.length === 0}>
          <FontAwesomeIcon icon={faBackwardStep} /> <Text id="buttons.undo" />
        </button>
        {restartButton}
        {analysisButton(false)}
      </div>
    </div>
  );
};
