import { FunctionComponent } from "preact";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faBackwardStep } from "@fortawesome/free-solid-svg-icons/faBackwardStep";
import { faRotateBack } from "@fortawesome/free-solid-svg-icons/faRotateBack";

import {
  Board,
  computePlace,
  computeMove,
  computeReset,
  computeUndo,
  WINNING_POSITIONS,
} from "teeko-cc-common/src/model";

import { BoardView } from "./BoardView";

export const Game: FunctionComponent<{
  board: Board;
  roomPath?: string;
  showHelp: () => void;
  moveToBoard: (board: Board) => void;
}> = ({ board, roomPath, showHelp, moveToBoard }) => {
  function move(from: number, to: number) {
    const after = computeMove(board, from, to);
    if (after && roomPath) after.p = false;
    if (after) moveToBoard(after);
  }

  function place(pos: number) {
    const after = computePlace(board, pos);
    if (after && roomPath) after.p = false;
    if (after) moveToBoard(after);
  }

  function undo() {
    const after = computeUndo(board);
    if (after && roomPath) after.p = !after.p;
    if (after) moveToBoard(after);
  }

  const won = WINNING_POSITIONS.has(board.a) || WINNING_POSITIONS.has(board.b);

  return (
    <div class="game">
      <BoardView
        board={board}
        place={place}
        move={move}
        klass="full"
        showStatus={true}
      />
      <p class="buttonsBar">
        <button id="undo" onClick={undo} disabled={board.m.length === 0}>
          <FontAwesomeIcon icon={faBackwardStep} />
        </button>
        <button
          id="reset"
          onClick={() => moveToBoard(computeReset(board))}
          disabled={board.a === 0}
        >
          <FontAwesomeIcon icon={faRotateBack} />
        </button>
      </p>
    </div>
  );
};
