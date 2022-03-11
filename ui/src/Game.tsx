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
import { OnlineStatus } from "./App.tsx";

export const Game: FunctionComponent<{
  initial: Board;
  roomPath?: string;
  showHelp: () => void;
  setPop: (count: number) => void;
  setOnlineStatus: (status: OnlineStatus) => void;
}> = ({ initial, roomPath, showHelp, setPop, setOnlineStatus }) => {
  const [board, setBoard] = useState(initial);
  const [ws, setWs] = useState<Sockette | undefined>(undefined);

  useEffect(() => {
    if (roomPath) {
      const sockette = new Sockette(`wss://ws.teeko.cc/room/${roomPath}`, {
        onopen: () => setOnlineStatus(OnlineStatus.ONLINE),
        onreconnect: () => setOnlineStatus(OnlineStatus.OFFLINE),
        onmessage: (evt: MessageEvent) => {
          const msg = JSON.parse(evt.data) as Message;
          if (msg.st === null) {
            ws?.send(JSON.stringify({ st: { board } } as Message));
          }
          if (msg.st?.board) {
            moveToBoard(msg.st.board, false);
          }
          if (msg.pop !== undefined) {
            setPop(msg.pop);
          }
        },
      });
      setWs(sockette);
      return () => {
        sockette.close();
        setWs(undefined);
      }
    }
  }, [roomPath]);

  function moveToBoard(board: Board, propagate = true) {
    localStorage.setItem("board", JSON.stringify(board));
    setBoard(board);
    if (propagate && ws) {
      ws.send(JSON.stringify({ st: { board } } as Message));
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
    let { a, b, m: om, p } = board;
    const wasA = om.length % 2 === 1;
    const m = om.slice(0, -1);
    const last = om.length > 0 ? om[m.length] : undefined;
    if (last === undefined) return;

    const target = wasA ? a : b;
    if (Array.isArray(last)) {
      const [to, from] = last;
      const result = (target & ~(1 << from)) | (1 << to);
      if (wasA) a = result;
      else b = result;
      console.log({ a, b, m, p });
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
