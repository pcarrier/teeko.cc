import { FunctionComponent } from "preact";
import { useState } from "preact/hooks";
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
  isBotGame?: boolean;
  singleBotMode?: boolean;
  botSelection?: number;
}> = ({ board, roomPath, moveToBoard, disabled, isBotGame, singleBotMode, botSelection }) => {
  const [analysisEnabled, setAnalysisEnabled] = useState(false);
  const { moves: analysisMoves } = useAnalysis(board, analysisEnabled);

  const move = (from: number, to: number) => {
    if (disabled) return;
    const after = computeMove(board, from, to);
    if (after && roomPath) after.p = false;
    if (after) moveToBoard(after);
  };

  const place = (pos: number) => {
    if (disabled) return;
    const after = computePlace(board, pos);
    if (after && roomPath) after.p = false;
    if (after) moveToBoard(after);
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
        analysis={analysisEnabled ? analysisMoves : undefined}
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
          onClick={() => setAnalysisEnabled(!analysisEnabled)}
          class={analysisEnabled ? "selected" : undefined}
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} />{" "}
          <Text id="buttons.analysis" />
        </button>
      </div>
    </div>
  );
};
