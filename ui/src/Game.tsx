import { FunctionComponent, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import Sockette from "sockette";

import {
  Board,
  computeDrop,
  computeMove,
  emptyBoard,
  Message,
} from "teeko-cc-common/src/model";

import { BoardView } from "./BoardView";

export const Game: FunctionComponent<{
  initial: Board;
  roomPath?: string;
  showHelp: () => void;
}> = ({ initial, roomPath, showHelp }) => {
  const [board, setBoard] = useState(initial);
  const [ws, setWs] = useState<Sockette | undefined>(undefined);

  useEffect(() => {
    if (roomPath) {
      const sockette = new Sockette(`wss://ws.teeko.cc/room/${roomPath}`, {
        onmessage: (msg) => {
          const evt = JSON.parse(msg.data);
          if (evt.state === null) {
            ws?.send(JSON.stringify({ state: { board } }));
          }
          if (evt.state?.board) {
            moveToBoard(evt.state.board, false);
          }
        },
      });
      setWs(sockette);
      return () => sockette.close();
    }
  }, [roomPath]);

  function moveToBoard(board: Board, propagate = true) {
    localStorage.setItem("board", JSON.stringify(board));
    setBoard(board);
    if (propagate && ws) {
      ws.send(JSON.stringify({ state: { board } } as Message));
    }
  }

  function move(from: number, to: number) {
    const after = computeMove(board, from, to);
    if (after) moveToBoard(after);
  }

  function drop(pos: number) {
    const after = computeDrop(board, pos);
    if (after) moveToBoard(after);
  }

  function undo() {
    let { a, b, m, p } = board;
    const t = m.length % 2;
    const last = m.pop();
    if (last === undefined) return;

    const wasA = t % 2 === 1;
    const target = wasA ? a : b;
    if (Array.isArray(last)) {
      const [to, from] = last;
      const result = (target & ~(1 << from)) | (1 << to);
      if (wasA) a = result;
      else b = result;
      moveToBoard({ a, b, m, p });
    } else {
      const result = target & ~(1 << last);
      if (wasA) a = result;
      else b = result;
      moveToBoard({ a, b, m, p });
    }
  }

  return (
    <>
      <BoardView
        board={board}
        drop={drop}
        move={move}
        klass="full"
        showStatus={true}
      />
      <p class="buttons">
        {board.m.length === 0 ? null : <button onClick={undo}>Undo</button>}
        {board.a !== 0 ? (
          <button onClick={() => moveToBoard(emptyBoard())}>Reset</button>
        ) : (
          <></>
        )}
        <button
          onClick={() =>
            (window.location.href = "https://discord.gg/KEj9brTRS6")
          }
        >
          Discord
        </button>
        <button onClick={showHelp}>Help</button>
      </p>
    </>
  );
};
