import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";

import {
  Board,
  computePlace,
  computeMove,
  computeReset,
  computeUndo,
} from "teeko-cc-common/src/model";

import { BoardView } from "./BoardView";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord } from "@fortawesome/free-brands-svg-icons/faDiscord";
import { faQuestion } from "@fortawesome/free-solid-svg-icons/faQuestion";
import { faRotateLeft } from "@fortawesome/free-solid-svg-icons/faRotateLeft";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

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
        <button onClick={undo} disabled={board.m.length === 0}>
          <FontAwesomeIcon icon={faRotateLeft} />
        </button>
        <button
          onClick={() => moveToBoard(computeReset(board))}
          disabled={board.a === 0}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
        <button
          onClick={() => window.open("https://discord.gg/KEj9brTRS6", "_blank")}
        >
          <FontAwesomeIcon icon={faDiscord} />
        </button>
        <button onClick={showHelp}>
          <FontAwesomeIcon icon={faQuestion} />
        </button>
      </p>
    </div>
  );
};
