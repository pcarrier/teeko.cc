import { FunctionComponent, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import Sockette from "sockette";

import { Board, emptyBoard, SIZE, SLOTS } from "./model";
import { setHash } from "./utils.ts";

import { BoardView } from "./BoardView";

export const Game: FunctionComponent<{
  initial: Board;
  roomPath?: string;
  showHelp: () => void;
}> = ({ initial, roomPath, showHelp }) => {
  const [board, setBoard] = useState(initial);
  const [ws, setWs] = useState<Sockette | undefined>(undefined);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (hasCopied) setTimeout(() => setHasCopied(false), 1_000);
  }, [hasCopied]);

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
        }
      });
      setWs(sockette);
      return () => sockette.close();
    }
  }, [roomPath]);

  function moveToBoard(board: Board, propagate = true) {
    setHash(board);
    localStorage.setItem("board", JSON.stringify(board));
    setBoard(board);
    if (propagate && ws) {
      ws.send(JSON.stringify({ state: { board } }));
    }
  }

  function move(from: number, to: number) {
    let { a, b, m, p } = board;
    const t = m.length % 2;
    const isA = t % 2 === 0;

    m.push([from, to]);

    const [ours, theirs] = isA ? [a, b] : [b, a];
    if (!(ours & (1 << from))) {
      console.log("skipped drop");
    }
    if (ours & (1 << to)) {
      console.log("avoided collision with self");
      return;
    }
    if (theirs & (1 << to)) {
      console.log("avoided collision with other player");
      return;
    }
    const result = (ours & ~(1 << from)) | (1 << to);
    if (isA) {
      a = result;
    } else {
      b = result;
    }
    moveToBoard({ a, b, p, m });
  }

  function drop(pos: number) {
    let { a, b, m, p } = board;
    const t = m.length % 2;
    const isA = t % 2 === 0;

    m.push(pos);

    const [target, other] = isA ? [a, b] : [b, a];
    if (other & (1 << pos)) return;
    const result = target | (1 << pos);
    if (isA) a = result;
    else b = result;
    moveToBoard({ a, b, m, p });
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

  function copy() {
    let result = "";
    for (let i = 0; i < SLOTS; i++) {
      result += board.a & (1 << i) ? "🔵" : board.b & (1 << i) ? "🔴" : "⚫️";
      if (i % SIZE === SIZE - 1 && i != SLOTS - 1) {
        result += "\n";
      }
    }
    navigator.clipboard.writeText(result).then(() => setHasCopied(true));
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
      <p>
        {board.m.length === 0 ? null : <button onClick={undo}>Undo</button>}
        {board.a !== 0 ? (
          <button onClick={() => moveToBoard(emptyBoard())}>Reset</button>
        ) : (
          <></>
        )}
        <button onClick={showHelp}>Rules</button>
        <button onClick={copy}>{hasCopied ? "Copied!" : "Copy"}</button>
      </p>
      <h1>Teeko by John Scarne</h1>
    </>
  );
};
