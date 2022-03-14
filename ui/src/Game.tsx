import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";

import {
  Board,
  computeDrop,
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

  function drop(pos: number) {
    const after = computeDrop(board, pos);
    if (roomPath) after.p = false;
    if (after) moveToBoard(after);
  }

  function undo() {
    const after = computeUndo(board);
    if (roomPath) after.p = false;
    if (after) moveToBoard(after);
  }

  return (
    <div class="game">
      <BoardView
        board={board}
        drop={drop}
        move={move}
        klass="full"
        showStatus={true}
      />
      <p class="buttons">
        <button onClick={undo} disabled={board.m.length === 0}>
          <Text id="game.undo" />
        </button>
        <button
          onClick={() => moveToBoard(computeReset(board))}
          disabled={board.a === 0}
        >
          <Text id="game.reset" />
        </button>
        <button
          onClick={() => window.open("https://discord.gg/KEj9brTRS6", "_blank")}
        >
          <Text id="game.discord" />
        </button>
        <button onClick={showHelp}>
          <Text id="game.help" />
        </button>
      </p>
    </div>
  );
};
