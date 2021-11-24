import "./index.css";
import { FunctionComponent, render } from "preact";
import { useState } from "preact/compat";

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
const CROWN_RADIUS = SLOT_RADIUS * 1.25;

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
      piece = <circle r={PIECE_RADIUS} cx={x} cy={y} fill="#ff0000" />;
      break;
    case InSlot.B:
      piece = <circle r={PIECE_RADIUS} cx={x} cy={y} fill="#0000ff" />;
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
        <circle r={CROWN_RADIUS} cx={x} cy={y} fill="#000" />
      ) : selectable ? (
        <circle
          r={CROWN_RADIUS}
          cx={x}
          cy={y}
          fill={turn === Player.A ? "#ff808080" : "#8080ff80"}
        />
      ) : null}
      <circle r={SLOT_RADIUS} cx={x} cy={y} fill="#808080" />
      {piece}
    </g>
  );
};

type Board = {
  a: number;
  b: number;
  turn: Player;
  move: (from: number, to: number) => void;
};

function pieces(n: number): Set<number> {
  const result = [];
  for (let i = 0; i < SLOTS; i++) {
    if (n & 1) result.push(i);
    n >>= 1;
  }
  return new Set(result);
}

const BoardView: FunctionComponent<Board> = ({ a, b, turn, move }) => {
  const [selected, setSelected] = useState<number | undefined>(undefined);

  const aPieces = pieces(a);
  const bPieces = pieces(b);
  const emptySlots = new Set(
    POS_ARRAY.filter((x) => !aPieces.has(x) && !bPieces.has(x))
  );
  const x = turn === Player.A ? a : b;
  const ourPieces = turn === Player.A ? aPieces : bPieces;
  const dropping = ourPieces.size < 4; /* FIXME: 8 */

  const aWin = WINNING_POSITIONS.has(a);
  const bWin = WINNING_POSITIONS.has(b);
  const win = aWin || bWin;

  const validTargets: Set<number> = win
    ? new Set()
    : dropping
    ? emptySlots
    : selected === undefined
    ? new Set(
        [...ourPieces].filter((pos) => NEIGHS_BY_POSITION[pos] & ~(a | b))
      )
    : new Set(
        [...pieces(NEIGHS_BY_POSITION[selected])].filter(
          (x) => !aPieces.has(x) && !bPieces.has(x)
        )
      );

  function drop(position: number) {
    console.log(position, "dropped");
  }

  function click(position: number) {
    if (selected === position) {
      setSelected(undefined);
    } else if (selected !== undefined && validTargets.has(position)) {
      move(selected, position);
      setSelected(undefined);
    } else {
      if (dropping) drop(position);
      else {
        if (ourPieces.has(position)) {
          setSelected(position);
        } else {
          setSelected(undefined);
        }
      }
    }
  }

  const activePlayer = turn == Player.A ? "red" : "blue";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-1 -1 6 6"
      className="board"
    >
      <g>
        <text
          x={-0.9}
          y={-0.75}
          text-anchor="start"
          alignment-baseline="middle"
          font-size=".2"
          style="user-select:none;"
        >
          {aWin
            ? `red won`
            : bWin
            ? `blue won`
            : dropping
            ? `${activePlayer} drops…`
            : selected === undefined
            ? `${activePlayer} moves from…`
            : `${activePlayer} moves from ${selected + 1} to…`}
        </text>
        <line x1="0" y1="0" x2="0" y2="4" />
        <line x1="1" y1="0" x2="1" y2="4" />
        <line x1="2" y1="0" x2="2" y2="4" />
        <line x1="3" y1="0" x2="3" y2="4" />
        <line x1="4" y1="0" x2="4" y2="4" />
        <line x1="0" y1="0" x2="4" y2="0" />
        <line x1="0" y1="1" x2="4" y2="1" />
        <line x1="0" y1="2" x2="4" y2="2" />
        <line x1="0" y1="3" x2="4" y2="3" />
        <line x1="0" y1="4" x2="4" y2="4" />
        <line x1="0" y1="0" x2="4" y2="4" />
        <line x1="0" y1="1" x2="3" y2="4" />
        <line x1="0" y1="2" x2="2" y2="4" />
        <line x1="0" y1="3" x2="1" y2="4" />
        <line x1="1" y1="0" x2="4" y2="3" />
        <line x1="2" y1="0" x2="4" y2="2" />
        <line x1="3" y1="0" x2="4" y2="1" />
        <line x1="0" y1="0" x2="4" y2="0" />
        <line x1="1" y1="0" x2="4" y2="3" />
        <line x1="2" y1="0" x2="4" y2="2" />
        <line x1="3" y1="0" x2="4" y2="1" />
        <line x1="0" y1="0" x2="4" y2="0" />
        <line x1="1" y1="0" x2="0" y2="1" />
        <line x1="2" y1="0" x2="0" y2="2" />
        <line x1="3" y1="0" x2="0" y2="3" />
        <line x1="4" y1="0" x2="0" y2="4" />
        <line x1="4" y1="1" x2="1" y2="4" />
        <line x1="4" y1="2" x2="2" y2="4" />
        <line x1="4" y1="3" x2="3" y2="4" />
        {POS_ARRAY.map((position) => {
          const contains: InSlot = aPieces.has(position)
            ? InSlot.A
            : bPieces.has(position)
            ? InSlot.B
            : InSlot.NONE;
          return (
            <Slot
              position={position}
              contains={contains}
              selected={selected === position}
              selectable={validTargets.has(position)}
              click={() => click(position)}
              turn={turn}
            />
          );
        })}
      </g>
    </svg>
  );
};

const App: FunctionComponent = () => {
  return (
    <>
      {[...WINNING_POSITIONS].map((pos, idx) => (
        <BoardView
          a={idx % 2 === 0 ? pos : 0}
          b={idx % 2 === 0 ? 0 : pos}
          turn={idx % 3 === 0 ? Player.A : Player.B}
          move={(from, to) => console.log("move", from, to)}
        />
      ))}
    </>
  );
};

render(<App />, document.getElementById("app")!);
