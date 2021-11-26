import "./index.css";
import { FunctionComponent, h, render } from "preact";
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
import { CROWN_RADIUS, SLOT_RADIUS } from "./sizing";
import { Color, Piece } from "./piece";

const POS_ARRAY = Array.from(Array(SLOTS).keys());

type Board = {
  a: number;
  b: number;
  t: number; // turn
  p: boolean; // playing
  l: number | [number, number] | undefined; // last action
};

const EmptyBoard: Board = {
  a: 0,
  b: 0,
  t: Player.A,
  p: true,
  l: undefined,
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
  drop: (position: number) => void;
  move: (from: number, to: number) => void;
};

const BoardView: FunctionComponent<BoardViewAttrs> = ({
  board,
  drop,
  move,
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
      move(selected, position);
      setSelected(undefined);
    } else {
      if (dropping) {
        if (emptySlots.has(position)) drop(position);
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

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-0.5 -0.5 5 5"
        className="board"
        ref={svgRef}
      >
        {lastAction === undefined ? (
          <></>
        ) : Array.isArray(lastAction) ? (
          <line
            x1={x(lastAction[0])}
            y1={y(lastAction[0])}
            x2={x(lastAction[1])}
            y2={y(lastAction[1])}
            stroke={t % 2 === 0 ? "#800000" : "#000080"}
            className="last"
          />
        ) : (
          <circle
            r={CROWN_RADIUS}
            cx={lastAction % 5}
            cy={Math.floor(lastAction / 5)}
            fill={t % 2 === 0 ? "#800000" : "#000080"}
          />
        )}
        <g>
          <line x1="0" y1="0" x2="0" y2="4" stroke="#404040" />
          <line x1="1" y1="0" x2="1" y2="4" stroke="#404040" />
          <line x1="2" y1="0" x2="2" y2="4" stroke="#404040" />
          <line x1="3" y1="0" x2="3" y2="4" stroke="#404040" />
          <line x1="4" y1="0" x2="4" y2="4" stroke="#404040" />
          <line x1="0" y1="0" x2="4" y2="0" stroke="#404040" />
          <line x1="0" y1="1" x2="4" y2="1" stroke="#404040" />
          <line x1="0" y1="2" x2="4" y2="2" stroke="#404040" />
          <line x1="0" y1="3" x2="4" y2="3" stroke="#404040" />
          <line x1="0" y1="4" x2="4" y2="4" stroke="#404040" />
          <line x1="0" y1="0" x2="4" y2="4" stroke="#404040" />
          <line x1="0" y1="1" x2="3" y2="4" stroke="#404040" />
          <line x1="0" y1="2" x2="2" y2="4" stroke="#404040" />
          <line x1="0" y1="3" x2="1" y2="4" stroke="#404040" />
          <line x1="1" y1="0" x2="4" y2="3" stroke="#404040" />
          <line x1="2" y1="0" x2="4" y2="2" stroke="#404040" />
          <line x1="3" y1="0" x2="4" y2="1" stroke="#404040" />
          <line x1="0" y1="0" x2="4" y2="0" stroke="#404040" />
          <line x1="1" y1="0" x2="4" y2="3" stroke="#404040" />
          <line x1="2" y1="0" x2="4" y2="2" stroke="#404040" />
          <line x1="3" y1="0" x2="4" y2="1" stroke="#404040" />
          <line x1="0" y1="0" x2="4" y2="0" stroke="#404040" />
          <line x1="1" y1="0" x2="0" y2="1" stroke="#404040" />
          <line x1="2" y1="0" x2="0" y2="2" stroke="#404040" />
          <line x1="3" y1="0" x2="0" y2="3" stroke="#404040" />
          <line x1="4" y1="0" x2="0" y2="4" stroke="#404040" />
          <line x1="4" y1="1" x2="1" y2="4" stroke="#404040" />
          <line x1="4" y1="2" x2="2" y2="4" stroke="#404040" />
          <line x1="4" y1="3" x2="3" y2="4" stroke="#404040" />

          {[...validTargets].map((pos) => (
            <circle
              key={pos}
              r={CROWN_RADIUS}
              cx={x(pos)}
              cy={y(pos)}
              fill={t % 2 === 0 ? "#0000ff80" : "#ff000080"}
            />
          ))}

          {selected ? (
            <circle
              r={CROWN_RADIUS}
              cx={x(selected)}
              cy={y(selected)}
              fill="#00000080"
            />
          ) : (
            <></>
          )}

          {POS_ARRAY.map((pos) => (
            <circle
              key={pos}
              r={SLOT_RADIUS}
              cx={x(pos)}
              cy={y(pos)}
              fill="#404040"
              onClick={() => click(pos)}
            />
          ))}

          {[...aPieces, ...bPieces].map((pos) => {
            return (
              <Piece
                key={pos}
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
          {dragState && (typeof selected != 'undefined') && (
            <Piece
              dummy
              color={t % 2 === 0 ? Color.A : Color.B}
              position={selected}
              offset={{ x: dragState.x, y: dragState.y }}
            />
          )}
        </g>
      </svg>
      <p>
        {aWin
          ? `Blue won.`
          : bWin
          ? `Red won.`
          : dropping
          ? `${activePlayer} drops…`
          : selected === undefined
          ? `${activePlayer} moves from…`
          : `${activePlayer} moves to…`}
      </p>
    </>
  );
};

const Game: FunctionComponent<{ initial: Board }> = ({
  initial,
}: {
  initial: Board;
}) => {
  const [board, setBoard] = useState(initial);

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
    moveToBoard({ a, b, t: t + 1, p, l: [from, to] });
  }

  function drop(pos: number) {
    let { a, b } = board;
    const { t, p } = board;
    const isA = t % 2 === 0;

    const target = isA ? a : b;
    const result = target | (1 << pos);
    if (isA) a = result;
    else b = result;
    moveToBoard({ a, b, t: t + 1, p, l: pos });
  }

  function reset() {
    if (board.a === 0 && board.b === 0) return;
    moveToBoard({ ...EmptyBoard });
  }

  return (
    <>
      <BoardView board={board} drop={drop} move={move} />
      <button onClick={reset}>Reset</button>
    </>
  );
};

const App: FunctionComponent = () => {
  const initial = { ...EmptyBoard };
  if (location.hash.length > 1) {
    try {
      const [a, b, t, l] = JSON.parse(decodeURI(location.hash.substring(1)));
      initial.a = a;
      initial.b = b;
      initial.t = t;
      initial.l = l;
    } catch (_) {
      console.log("Invalid URL parameters");
    }
  }

  return (
    <>
      <p>Make a unit square or a line in any direction.</p>
      <Game initial={initial} />
      <h1>Teeko by John Scarne</h1>
    </>
  );
};

render(<App />, document.body);
