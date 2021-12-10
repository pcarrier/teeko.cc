import "./index.less";
import { FunctionComponent, render, h } from "preact";
import { useRef, useState } from "preact/hooks";
import { Rect, useRect } from "./draggable/useRect";
import {
  NEIGHS_BY_POSITION,
  Player,
  SIZE,
  SLOTS,
  WINNING_POSITIONS,
  x,
  y,
} from "./logic";
import {
  LARGE_CROWN_RADIUS,
  LAST_ACTION_RADIUS,
  LINE_MARGIN,
  PIECE_RADIUS,
  SLOT_RADIUS,
} from "./sizing";
import { Color, Piece } from "./piece";
import classnames from "classnames";

const POS_ARRAY = Array.from(Array(SLOTS).keys());

type Board = {
  a: number;
  b: number;
  t: number; // turn
  p: boolean; // playing
  l: number | [number, number] | null; // last action
};

const EmptyBoard: Board = {
  a: 0,
  b: 0,
  t: Player.A,
  p: true,
  l: null,
};

function pieces(n: number): Set<number> {
  const result = [];
  for (let i = 0; i < SLOTS; i++) {
    if (n & 1) result.push(i);
    n >>= 1;
  }
  return new Set(result);
}

type BoardViewAttrs = {
  board: Board;
  drop?: (position: number) => void;
  move?: (from: number, to: number) => void;
  klass?: string;
  showStatus?: boolean;
};

const BoardView: FunctionComponent<BoardViewAttrs> = ({
  board,
  drop,
  move,
  klass,
  showStatus,
}) => {
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const { a, b, t, p } = board;
  const aPieces = pieces(a);
  const bPieces = pieces(b);
  const emptySlots = new Set(
    POS_ARRAY.filter((x) => !aPieces.has(x) && !bPieces.has(x))
  );
  const aWin = WINNING_POSITIONS.has(a);
  const bWin = WINNING_POSITIONS.has(b);
  const win = aWin || bWin;

  const ourPieces =
    !p || win ? new Set<number>() : t % 2 === 0 ? aPieces : bPieces;
  const movable = new Set(
    [...ourPieces].filter((pos) => NEIGHS_BY_POSITION[pos] & ~(a | b))
  );
  const neighborsOfSelected =
    selected === undefined
      ? new Set<number>()
      : new Set(
          [...pieces(NEIGHS_BY_POSITION[selected])].filter(
            (x) => !aPieces.has(x) && !bPieces.has(x)
          )
        );

  const dropping = p && !win && ourPieces.size < 4;

  const validTargets: Set<number> = win
    ? new Set()
    : dropping
    ? emptySlots
    : selected === undefined
    ? movable
    : neighborsOfSelected;

  function click(position: number) {
    if (!p) return;
    if (selected === position) {
      setSelected(undefined);
    } else if (selected !== undefined && validTargets.has(position)) {
      move?.(selected, position);
      setSelected(undefined);
    } else {
      if (dropping) {
        if (emptySlots.has(position)) drop?.(position);
      } else {
        if (!win && movable.has(position)) {
          setSelected(position);
        } else {
          setSelected(undefined);
        }
      }
    }
  }

  const activePlayer = t % 2 === 0 ? "Blue" : "Red";

  const status = showStatus ? (
    <p>
      {aWin
        ? `Teeko! Blue won.`
        : bWin
        ? `Teeko! Red won.`
        : dropping
        ? `${activePlayer} drops piece ${ourPieces.size + 1} out of 4…`
        : selected === undefined
        ? `${activePlayer} moves from…`
        : `${activePlayer} moves to…`}
    </p>
  ) : (
    <></>
  );

  const lastAction = board.l;

  const svgRef = useRef<SVGSVGElement>(null);
  const svgRect = useRect(svgRef);
  const aspect: Rect | null = svgRect && {
    width: svgRect.width / SIZE,
    height: svgRect.height / SIZE,
    x: 0,
    y: 0,
  };

  const [dragState, setDragState] = useState<
    { x: number; y: number } | undefined
  >(undefined);

  const dragPos =
    selected !== undefined && dragState !== undefined
      ? Math.round(dragState.x + (selected % SIZE)) +
        SIZE * Math.round(Math.floor(selected / SIZE) + dragState.y)
      : undefined;
  const releasePos =
    dragPos && (selected === dragPos || neighborsOfSelected.has(dragPos))
      ? dragPos
      : selected;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-0.5 -0.5 5 5"
        className={classnames("board", klass)}
        ref={svgRef}
      >
        <g>
          {[0, 1, 2, 3].map((x) =>
            [0, 1, 2, 3].map((y) => (
              <>
                <line x1={x} y1={y} x2={x + 1} y2={y} class="bg" />
                <line x1={x} y1={y} x2={x} y2={y + 1} class="bg" />
                <line x1={x} y1={y} x2={x + 1} y2={y + 1} class="bg" />
                <line x1={x} y1={y + 1} x2={x + 1} y2={y} class="bg" />
              </>
            ))
          )}
          {[0, 1, 2, 3].map((n) => (
            <>
              <line x1={n} y1={4} x2={n + 1} y2={4} class="bg" />
              <line x1={4} y1={n} x2={4} y2={n + 1} class="bg" />
            </>
          ))}

          {lastAction === null ? (
            <></>
          ) : Array.isArray(lastAction) ? (
            <line
              x1={x(lastAction[0])}
              y1={y(lastAction[0])}
              x2={x(lastAction[1])}
              y2={y(lastAction[1])}
              class={classnames("last", t % 2 === 0 ? "B" : "A")}
            />
          ) : (
            <circle
              r={LAST_ACTION_RADIUS}
              cx={lastAction % 5}
              cy={Math.floor(lastAction / 5)}
              class={classnames("last", t % 2 === 0 ? "B" : "A")}
            />
          )}

          {POS_ARRAY.map((pos) => (
            <circle r={LINE_MARGIN} cx={x(pos)} cy={y(pos)} />
          ))}

          {selected ? (
            <circle
              key="selected"
              r={LARGE_CROWN_RADIUS}
              cx={x(selected)}
              cy={y(selected)}
              class="selected"
            />
          ) : (
            <></>
          )}

          {POS_ARRAY.map((pos) => (
            <circle
              key={`bg${pos}`}
              r={SLOT_RADIUS}
              cx={x(pos)}
              cy={y(pos)}
              class={classnames(
                "bg",
                releasePos === pos
                  ? "release"
                  : (dropping || selected !== undefined) &&
                    validTargets.has(pos)
                  ? "target"
                  : undefined,
                t % 2 === 0 ? "A" : "B"
              )}
            />
          ))}

          {!dropping &&
            selected === undefined &&
            [...validTargets].map((pos) => (
              <circle
                key={`target${pos}`}
                r={LARGE_CROWN_RADIUS}
                cx={x(pos)}
                cy={y(pos)}
                class={classnames("target", t % 2 === 0 ? "A" : "B")}
              />
            ))}

          {POS_ARRAY.map((pos) => (
            <circle
              key={pos}
              r={PIECE_RADIUS}
              cx={x(pos)}
              cy={y(pos)}
              fill="#00000000" // invisible
              onClick={() => click(pos)}
            />
          ))}

          {[...aPieces, ...bPieces].map((pos) => {
            return (
              <Piece
                key={`piece${pos}`}
                position={pos}
                aspect={aspect}
                dragStart={() => {
                  setSelected(pos);
                }}
                dragMove={({ x, y }) => {
                  setDragState({ x, y });
                }}
                dragEnd={(position) => {
                  setDragState(undefined);
                  if (neighborsOfSelected.has(position)) click(position);
                  else setSelected(undefined);
                }}
                color={aPieces.has(pos) ? Color.A : Color.B}
                selected={selected === pos}
                selectable={validTargets.has(pos)}
                click={() => click(pos)}
              />
            );
          })}
          {dragState && selected !== undefined && (
            <Piece
              dummy
              key="dummy"
              color={t % 2 === 0 ? Color.A : Color.B}
              position={selected}
              offset={{ x: dragState.x, y: dragState.y }}
            />
          )}
        </g>
      </svg>
      {status}
    </>
  );
};

const Game: FunctionComponent<{
  initial: Board;
}> = ({ initial }: { initial: Board }) => {
  const [board, setBoard] = useState(initial);
  const [showHelp, setShowHelp] = useState(false);

  function moveToBoard(board: Board) {
    location.replace(
      `#${JSON.stringify([board.a, board.b, board.t, board.l])}`
    );
    setBoard(board);
  }

  function move(from: number, to: number) {
    let { a, b } = board;
    const { t, p } = board;
    const isA = t % 2 === 0;

    const target = isA ? a : b;
    const result = (target & ~(1 << from)) | (1 << to);
    if (isA) {
      a = result;
    } else {
      b = result;
    }
    moveToBoard({ a, b, t: (t + 1) % 2, p, l: [from, to] });
  }

  function drop(pos: number) {
    let { a, b } = board;
    const { t, p } = board;
    const isA = t % 2 === 0;

    const target = isA ? a : b;
    const result = target | (1 << pos);
    if (isA) a = result;
    else b = result;
    moveToBoard({ a, b, t: (t + 1) % 2, p, l: pos });
  }

  function undo() {
    let { a, b } = board;
    const { t, p } = board;
    const last = board.l;
    if (last === null) return;
    const wasA = board.t % 2 === 1;
    const target = wasA ? a : b;
    if (Array.isArray(last)) {
      const [to, from] = last;
      const result = (target & ~(1 << from)) | (1 << to);
      if (wasA) a = result;
      else b = result;
      moveToBoard({ a, b, t: t - 1, p, l: null });
    } else {
      const result = target & ~(1 << last);
      if (wasA) a = result;
      else b = result;
      moveToBoard({ a, b, t: t - 1, p, l: null });
    }
  }

  if (showHelp) return <Help close={() => setShowHelp(false)} />;

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
        {board.l !== null ? <button onClick={undo}>Undo</button> : <></>}
        {board.a !== 0 ? (
          <button onClick={() => moveToBoard({ ...EmptyBoard })}>Reset</button>
        ) : (
          <></>
        )}
        <button onClick={() => setShowHelp(true)}>Help</button>
      </p>
      <h1>TEEKO by John Scarne</h1>
    </>
  );
};

const Help: FunctionComponent<{ close: () => void }> = ({ close }) => (
  <div class="help">
    <p>Each player has 4 pieces.</p>
    <p>
      They first place one at a time on empty slots;
      <br />
      once all are placed, they move one at a time to an empty neighbor.
    </p>
    <p>Win by forming a straight line of 4 or a unit square:</p>
    <BoardView board={{ ...EmptyBoard, a: 2236928, p: false }} klass="half" />
    <BoardView board={{ ...EmptyBoard, b: 6336, p: false }} klass="half" />
    <p>
      <a href="https://en.wikipedia.org/wiki/Teeko">Wikipedia</a>,{" "}
      <a href="https://github.com/pcarrier/teeko.cc">code</a>,{" "}
      <a href="https://pcarrier.com/teeko">archives</a>
    </p>
    <p>
      <button onClick={close}>Play</button>
    </p>
  </div>
);

const App: FunctionComponent = () => {
  const initial = { ...EmptyBoard };
  const hash = location.hash;
  if (hash.length > 1) {
    const authPrefix = "#auth:";
    if (hash.startsWith(authPrefix)) {
      localStorage.setItem("pill", hash.substring(authPrefix.length));
      location.hash = "";
    } else {
      try {
        const [a, b, t, l] = JSON.parse(decodeURI(hash.substring(1)));
        initial.a = a;
        initial.b = b;
        initial.t = t;
        initial.l = l;
      } catch (_) {
        console.log("Invalid URL parameters");
      }
    }
  }

  return (
    <>
      <Game initial={initial} />
    </>
  );
};

render(<App />, document.body);
