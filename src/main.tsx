import "./index.css";
import { FunctionComponent, h, render } from "preact";
import { useState } from "preact/hooks";

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

const SLOT_RADIUS = Math.sqrt(2) / 4;
const PIECE_RADIUS = SLOT_RADIUS * 0.9;
const CROWN_RADIUS = SLOT_RADIUS * 1.1;

enum InSlot {
  NONE,
  A,
  B,
}

enum Player {
  A,
  B,
}

type SlotAttrs = {
  position: number;
  click: () => void;
  contains: InSlot;
  selected: boolean;
  selectable: boolean;
  turn: Player;
};

function x(pos: number) {
  return pos % 5;
}

function y(pos: number) {
  return Math.floor(pos / 5);
}

const Slot: FunctionComponent<SlotAttrs> = ({
  position,
  click,
  contains,
  selected,
  selectable,
  turn,
}: SlotAttrs) => {
  const x = position % SIZE;
  const y = Math.floor(position / SIZE);

  let piece;
  switch (contains) {
    case InSlot.A:
      piece = <circle r={PIECE_RADIUS} cx={x} cy={y} fill="#0000ff" />;
      break;
    case InSlot.B:
      piece = <circle r={PIECE_RADIUS} cx={x} cy={y} fill="#ff0000" />;
      break;
    default:
      piece = <></>;
  }

  return (
    <g
      onClick={click}
      style={
        "pointer-events: bounding-box; " +
        (selectable ? "cursor: pointer;" : "")
      }
    >
      {selected ? (
        <circle r={CROWN_RADIUS} cx={x} cy={y} fill="#80808080" />
      ) : selectable ? (
        <circle
          r={CROWN_RADIUS}
          cx={x}
          cy={y}
          fill={turn % 2 === 0 ? "#0000ff80" : "#ff000080"}
        />
      ) : null}
      <circle r={SLOT_RADIUS} cx={x} cy={y} fill="#404040" />
      {piece}
    </g>
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
  const ourPieces = !p
    ? new Set<number>()
    : t % 2 === 0
    ? aPieces
    : bPieces;
  const ourPiecesWithEmptyNeighbors = new Set(
    [...ourPieces].filter((pos) => NEIGHS_BY_POSITION[pos] & ~(a | b))
  );
  const aWin = WINNING_POSITIONS.has(a);
  const bWin = WINNING_POSITIONS.has(b);
  const win = aWin || bWin;

  const dropping = !win && ourPieces.size < 4;

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

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-0.5 -0.5 5 5"
        className="board"
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

          {POS_ARRAY.map((position) => {
            return (
              <Slot
                position={position}
                contains={
                  aPieces.has(position)
                    ? InSlot.A
                    : bPieces.has(position)
                    ? InSlot.B
                    : InSlot.NONE
                }
                selected={selected === position}
                selectable={validTargets.has(position)}
                click={() => click(position)}
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
    location.replace(`#${JSON.stringify(board)}`);
    setBoard(board);
  }

  function move(from: number, to: number) {
    let { a, b, t, p } = board;
    const isA = t % 2 === 0;

    let target = isA ? a : b;
    const result = (target & ~(1 << from)) | (1 << to);
    if (isA) {
      a = result;
    } else {
      b = result;
    }
    moveToBoard({ a, b, t: t + 1, p: playing, l: [from, to] });
  }

  function drop(pos: number) {
    let { a, b, t, p } = board;
    const isA = t % 2 === 0;

    let target = isA ? a : b;
    const result = target | (1 << pos);
    if (isA) a = result;
    else b = result;
    moveToBoard({ a, b, t: t + 1, p: playing, l: pos });
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
  let initial = { ...EmptyBoard };
  if (location.hash.length > 1) {
    try {
      JSON.parse(decodeURI(location.hash.substring(1)));
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