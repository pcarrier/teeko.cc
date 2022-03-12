import { FunctionComponent, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import Sockette from "sockette";

import {
  Board,
  computeDrop,
  computeMove, computeUndo,
  emptyBoard,
  Message,
  WINNING_POSITIONS,
} from "teeko-cc-common/src/model";

import { BoardView } from "./BoardView";
import { OnlineStatus } from "./App.tsx";

export const Game: FunctionComponent<{
  initial: Board;
  pill: string;
  roomPath?: string;
  showHelp: () => void;
  setPop: (count: number | undefined) => void;
  setOnlineStatus: (status: OnlineStatus) => void;
}> = ({ initial, roomPath, pill, showHelp, setPop, setOnlineStatus }) => {
  const [board, setBoard] = useState(initial);
  const [ws, setWs] = useState<Sockette | undefined>(undefined);

  function offline() {
    setOnlineStatus(OnlineStatus.OFFLINE);
    setPop(undefined);
  }

  useEffect(() => {
    const live = window.location.hostname === "teeko.cc";
    const url = live
      ? `wss://ws.teeko.cc/room/${roomPath}?pill=${pill}`
      : `ws://${window.location.hostname}:8081/room/${roomPath}?pill=${pill}`;
    if (roomPath) {
      const sockette = new Sockette(url, {
        onopen: () => setOnlineStatus(OnlineStatus.ONLINE),
        onreconnect: offline,
        onclose: offline,
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
      };
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
    const after = computeUndo(board);
    if (after) moveToBoard(after);
  }

  const won = WINNING_POSITIONS.has(board.a) || WINNING_POSITIONS.has(board.b);

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
          <button onClick={() => moveToBoard(emptyBoard())}>
            {won ? "New game" : "Reset"}
          </button>
        ) : (
          <></>
        )}
        <button
          onClick={() => window.open("https://discord.gg/KEj9brTRS6", "_blank")}
        >
          Discord
        </button>
        <button onClick={showHelp}>Help</button>
      </p>
    </>
  );
};
