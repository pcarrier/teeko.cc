import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faBackwardStep } from "@fortawesome/free-solid-svg-icons/faBackwardStep";
import { faRotateBack } from "@fortawesome/free-solid-svg-icons/faRotateBack";
import { Board, computePlace, computeMove, computeReset, computeUndo } from "teeko-cc-common/src/model";
import { BoardView } from "./BoardView";

export const Game: FunctionComponent<{
  board: Board;
  roomPath?: string;
  moveToBoard: (board: Board) => void;
}> = ({ board, roomPath, moveToBoard }) => {
  const move = (from: number, to: number) => {
    const after = computeMove(board, from, to);
    if (after && roomPath) after.p = false;
    if (after) moveToBoard(after);
  };

  const place = (pos: number) => {
    const after = computePlace(board, pos);
    if (after && roomPath) after.p = false;
    if (after) moveToBoard(after);
  };

  const undo = () => {
    const after = computeUndo(board);
    if (after && roomPath) after.p = !after.p;
    if (after) moveToBoard(after);
  };

  return (
    <div class="game">
      <BoardView board={board} place={place} move={move} klass="full" showStatus={true} />
      <div class="labeledButtons">
        <button onClick={undo} disabled={board.m.length === 0}>
          <FontAwesomeIcon icon={faBackwardStep} /> <Text id="buttons.undo" />
        </button>
        <button onClick={() => moveToBoard(computeReset(board))} disabled={board.a === 0}>
          <FontAwesomeIcon icon={faRotateBack} /> <Text id="buttons.restart" />
        </button>
      </div>
    </div>
  );
};
