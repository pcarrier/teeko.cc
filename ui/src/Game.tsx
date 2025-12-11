import { FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { Text } from "preact-i18n";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faBackwardStep } from "@fortawesome/free-solid-svg-icons/faBackwardStep";
import { faRotateBack } from "@fortawesome/free-solid-svg-icons/faRotateBack";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons/faMagnifyingGlass";
import {
  Board,
  computePlace,
  computeMove,
  computeReset,
  computeUndo,
} from "teeko-cc-common/src/model";
import { BoardView } from "./BoardView";
import { useAnalysis } from "./useAnalysis";

export const Game: FunctionComponent<{
  board: Board;
  roomPath?: string;
  moveToBoard: (board: Board) => void;
  disabled?: boolean;
  singleBotMode?: boolean;
  botSelection?: number;
  analysisUsed?: boolean;
  onAnalysisUsed?: () => void;
}> = ({ board, roomPath, moveToBoard, disabled, singleBotMode, botSelection, analysisUsed, onAnalysisUsed }) => {
  const [analysisOn, setAnalysisOn] = useState(false);
  const { moves: analysisMoves } = useAnalysis(board, analysisOn);

  const reportAnalysis = () => {
    if (analysisOn && onAnalysisUsed) onAnalysisUsed();
  };

  // Report if analysis is on when game resets
  const prevBoardA = useRef(board.a);
  useEffect(() => {
    const wasReset = prevBoardA.current !== 0 && board.a === 0;
    prevBoardA.current = board.a;
    if (wasReset) reportAnalysis();
  }, [board.a, analysisOn, onAnalysisUsed]);

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

  return (
    <div class="game">
      <BoardView
        board={board}
        place={place}
        move={move}
        klass="full"
        showStatus={true}
        analysis={analysisOn ? analysisMoves : undefined}
        botSelection={botSelection}
      />
      <div class="labeledButtons">
        <button onClick={undo} disabled={board.m.length === 0}>
          <FontAwesomeIcon icon={faBackwardStep} /> <Text id="buttons.undo" />
        </button>
        <button
          onClick={() => moveToBoard(computeReset(board))}
          disabled={board.a === 0}
        >
          <FontAwesomeIcon icon={faRotateBack} /> <Text id="buttons.restart" />
        </button>
        <button
          onClick={() => {
            if (analysisOn) {
              setAnalysisOn(false);
            } else {
              setAnalysisOn(true);
              onAnalysisUsed?.();
            }
          }}
          class={`${analysisOn ? "selected" : ""} ${analysisUsed ? "used" : ""}`.trim() || undefined}
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />{" "}
          <Text id="buttons.analysis" />
        </button>
      </div>
    </div>
  );
};
