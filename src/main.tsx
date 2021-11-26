import "./index.css";
import { FunctionComponent, h, render } from "preact";
import { useRef, useState } from "preact/hooks";
import { useDraggable } from "./draggable/useDraggable";
import classnames from "classnames";
import { Rect, useRect } from "./draggable/useRect";

const SIZE = 5;
const SLOTS = SIZE * SIZE;

const NEIGHS_BY_POSITION = [
  98, 229, 458, 916, 776, 3139, 7335, 14670, 29340, 24856, 100448, 234720,
  469440, 938880, 795392, 3214336, 7511040, 15022080, 30044160, 25452544,
  2195456, 5472256, 10944512, 21889024, 9175040,
];
const WINNING_POSITIONS = new Set([
  99, 198, 396, 792, 3168, 6336, 12672, 25344, 101376, 202752, 405504, 811008,
  3244032, 6488064, 12976128, 25952256, 15, 30, 480, 960, 15360, 30720, 491520,
  983040, 15728640, 31457280, 33825, 67650, 135300, 270600, 541200, 1082400,
  2164800, 4329600, 8659200, 17318400, 266305, 532610, 8521760, 17043520, 34952,
  69904, 1118464, 2236928,
]);

const POS_ARRAY = Array.from(Array(SLOTS).keys());

function x(pos: number) {
  return pos % SIZE;
}

function y(pos: number) {
  return Math.floor(pos / SIZE);
}

const SLOT_RADIUS = Math.sqrt(2) / 4;
const PIECE_RADIUS = SLOT_RADIUS * 0.9;
const CROWN_RADIUS = SLOT_RADIUS * 1.1;

enum Color {
  NONE,
  A,
  B,
}

enum Player {
  A,
  B,
}

type PieceAttrs = {
  position: number;
  click: () => void;
  dragStart: () => void;
  dragEnd: (newPosition: number) => void;
  color: Color;
  selected?: boolean;
  selectable: boolean;
  turn: Player;
  aspect: Rect | null;
};

const Piece: FunctionComponent<PieceAttrs> = ({
  position,
  click,
  dragEnd,
  dragStart,
  color,
  aspect,
}: PieceAttrs) => {
  const x = position % SIZE;
  const y = Math.floor(position / SIZE);

  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, state } =
    useDraggable({
      onDragStart() {
        dragStart?.();
      },
      onDragEnd({ delta }) {
        const dx = aspect ? delta.x / aspect.width : 0;
        const dy = aspect ? delta.y / aspect.height : 0;
        const nx = Math.round(x + dx);
        const ny = Math.round(y + dy);
        const p = ny * SIZE + nx;
        dragEnd?.(p);
      },
    });

  const dxNorm = state.isDragging && aspect ? state.dx / aspect.width : 0;
  const dyNorm = state.isDragging && aspect ? state.dy / aspect.height : 0;

  return (
    <circle
      onClick={click}
      r={PIECE_RADIUS}
      cx={x + dxNorm}
      cy={y + dyNorm}
      class={classnames("piece", {
        A: color === Color.A,
        B: color === Color.B,
        dragging: state.isDragging,
      })}
      {...{
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
      }}
    />
  );
};

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
  const ourPieces = !p ? new Set<number>() : t % 2 === 0 ? aPieces : bPieces;
  const ourPiecesWithEmptyNeighbors = new Set(
    [...ourPieces].filter((pos) => NEIGHS_BY_POSITION[pos] & ~(a | b))
  );
  const aWin = WINNING_POSITIONS.has(a);
  const bWin = WINNING_POSITIONS.has(b);
  const win = aWin || bWin;

  const dropping = p && !win && ourPieces.size < 4;

  const validTargets: Set<number> = win
    ? new Set()
    : dropping
    ? emptySlots
    : selected === undefined
    ? ourPiecesWithEmptyNeighbors
    : new Set(
        [...pieces(NEIGHS_BY_POSITION[selected])].filter(
          (x) => !aPieces.has(x) && !bPieces.has(x)
        )
      );

  function click(position: number) {
    if (!p) return;
    if (selected === position) {
      setSelected(undefined);
    } else if (selected !== undefined && validTargets.has(position)) {
      move(selected, position);
      setSelected(undefined);
    } else {
      if (dropping && emptySlots.has(position)) drop(position);
      else {
        if (!win && ourPiecesWithEmptyNeighbors.has(position)) {
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
                position={pos}
                aspect={aspect}
                dragStart={() => click(pos)}
                dragEnd={(position) => {
                  click(position);
                }}
                color={
                  aPieces.has(pos)
                    ? Color.A
                    : bPieces.has(pos)
                    ? Color.B
                    : Color.NONE
                }
                selected={selected === pos}
                selectable={validTargets.has(pos)}
                click={() => click(pos)}
                turn={t}
              />
            );
          })}
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
