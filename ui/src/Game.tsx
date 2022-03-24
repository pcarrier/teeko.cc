import { FunctionComponent } from "preact";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faBackward } from "@fortawesome/free-solid-svg-icons/faBackward";
import { faBackwardFast } from "@fortawesome/free-solid-svg-icons/faBackwardFast";

import {
  Board,
  computePlace,
  computeMove,
  computeReset,
  computeUndo,
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
    if (roomPath) after.p = false;
    if (after) moveToBoard(after);
  }

  function place(pos: number) {
    const after = computePlace(board, pos);
    if (roomPath) after.p = false;
    if (after) moveToBoard(after);
  }

  function undo() {
    const after = computeUndo(board);
    if (roomPath) after.p = !after.p;
    if (after) moveToBoard(after);
  }

  return (
    <div class="game">
      <BoardView
        board={board}
        place={place}
        move={move}
        klass="full"
        showStatus={true}
      />
      <p class="buttons">
        <button
          id="reset"
          onClick={() => moveToBoard(computeReset(board))}
          disabled={board.a === 0}
        >
          <FontAwesomeIcon icon={faBackwardFast} />
        </button>
        <button id="undo" onClick={undo} disabled={board.m.length === 0}>
          <FontAwesomeIcon icon={faBackward} />
        </button>
      </p>
    </div>
  );
};
