import classnames from "classnames";
import { FunctionComponent } from "preact";
import { Text } from "preact-i18n";
import { useMemo, useRef, useState } from "preact/hooks";

import { Rect, useRect } from "./useRect.js";

import {
  Board,
  DELTA_TO_DIRECTIONS,
  DIRECTION_TO_DELTAS,
  Player,
  SIZE,
  SLOTS,
} from "teeko-cc-common/src/model";
import {
  NEIGHS_BY_POSITION,
  pieces,
  WINNING_POSITIONS,
  x,
  y,
} from "../../common/src/model";
import {
  LARGE_CROWN_RADIUS,
  LAST_ACTION_RADIUS,
  LINE_MARGIN,
  PIECE_RADIUS,
  SLOT_RADIUS,
} from "./sizing";
import { Piece } from "./Piece";
import { Move, formatScore } from "./bot";

const POS_ARRAY = Array.from(Array(SLOTS).keys());

type BoardArrow = {
  from: number;
  to: number;
  player: Player;
};

type BoardViewAttrs = {
  board: Board;
  place?: (position: number) => void;
  move?: (from: number, to: number) => void;
  klass?: string;
  showStatus?: boolean;
  arrows?: BoardArrow[];
  analysis?: Move[];
  botSelection?: number;
};

export const BoardBackground = (
  <g class="bg">
    {[0, 1, 2, 3].map((x) =>
      [0, 1, 2, 3].map((y) => (
        <>
          <line key={`${x}${y}a`} x1={x} y1={y} x2={x + 1} y2={y} class="bg" />
          <line key={`${x}${y}b`} x1={x} y1={y} x2={x} y2={y + 1} class="bg" />
          <line
            key={`${x}${y}c`}
            x1={x}
            y1={y}
            x2={x + 1}
            y2={y + 1}
            class="bg"
          />
          <line
            key={`${x}${y}d`}
            x1={x}
            y1={y + 1}
            x2={x + 1}
            y2={y}
            class="bg"
          />
        </>
      ))
    )}
    {[0, 1, 2, 3].map((n) => (
      <>
        <line key={`${n}a`} x1={n} y1={4} x2={n + 1} y2={4} class="bg" />
        <line key={`${n}b`} x1={4} y1={n} x2={4} y2={n + 1} class="bg" />
      </>
    ))}
  </g>
);

export const BoardView: FunctionComponent<BoardViewAttrs> = ({
  board,
  place,
  move,
  klass,
  showStatus,
  arrows,
  analysis,
  botSelection,
}) => {
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [dragTurn, setDragTurn] = useState<number | undefined>(undefined);

  const { a, b, m, p } = board;
  const t = m.length % 2;
  const aPieces = useMemo(() => pieces(a), [a]);
  const bPieces = useMemo(() => pieces(b), [b]);
  const allPieces = useMemo(() => pieces(a | b), [a, b]);
  const emptySlots = useMemo(
    () => new Set(POS_ARRAY.filter((x) => !allPieces.has(x))),
    [a, b]
  );
  const aWin = WINNING_POSITIONS.has(a);
  const bWin = WINNING_POSITIONS.has(b);
  const win = aWin || bWin;

  const ourPieces = !p || win ? new Set<number>() : t === 0 ? aPieces : bPieces;

  if (selected !== undefined && !ourPieces.has(selected)) {
    setSelected(undefined);
  }

  const placing = p && !win && ourPieces.size < 4;

  const movable = placing
    ? new Set()
    : new Set(
        [...ourPieces].filter((pos) => NEIGHS_BY_POSITION[pos] & ~(a | b))
      );

  const emptyNeighborsOfSelected =
    selected === undefined
      ? new Set<number>()
      : new Set(
          [...pieces(NEIGHS_BY_POSITION[selected])].filter(
            (x) => !allPieces.has(x)
          )
        );

  const validTargets: Set<number> = win
    ? new Set()
    : placing
    ? emptySlots
    : selected === undefined
    ? movable
    : emptyNeighborsOfSelected;

  function click(position: number) {
    if (!p) return;
    if (selected === position) {
      setSelected(undefined);
    } else if (selected !== undefined && validTargets.has(position)) {
      move?.(selected, position);
      setSelected(undefined);
    } else {
      if (placing) {
        if (emptySlots.has(position)) place?.(position);
      } else {
        if (!win && movable.has(position)) {
          setSelected(position);
        } else {
          setSelected(undefined);
        }
      }
    }
  }

  const alreadyPlayed = t === 0 ? aPieces.size : bPieces.size;

  const lastAction =
    board.m.length > 0 ? board.m[board.m.length - 1] : undefined;

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
    selected !== undefined && dragState !== undefined && dragTurn === t
      ? Math.round(dragState.x + (selected % SIZE)) +
        SIZE * Math.round(Math.floor(selected / SIZE) + dragState.y)
      : undefined;
  const releasePos =
    dragPos && (selected === dragPos || emptyNeighborsOfSelected.has(dragPos))
      ? dragPos
      : selected;

  const drawableArrows = useMemo(() => {
    const result = arrows === undefined ? [] : [...arrows];
    if (releasePos !== selected && releasePos !== undefined)
      result.push({
        from: selected,
        to: releasePos,
        player: t === 0 ? Player.A : Player.B,
      });
    else if (!placing && dragPos === undefined && selected !== null) {
      emptyNeighborsOfSelected.forEach((to) =>
        result.push({
          from: selected,
          to,
          player: t === 0 ? Player.A : Player.B,
        })
      );
    }
    // Show arrows for bot selection
    if (botSelection !== undefined && selected === undefined) {
      const botEmptyNeighbors = [
        ...pieces(NEIGHS_BY_POSITION[botSelection]),
      ].filter((x) => !allPieces.has(x));
      botEmptyNeighbors.forEach((to) =>
        result.push({
          from: botSelection,
          to,
          player: t === 0 ? Player.A : Player.B,
        })
      );
    }
    return result;
  }, [
    arrows,
    selected,
    releasePos,
    dragPos,
    botSelection,
    allPieces,
    t,
    placing,
  ]);

  const turnNumber = board.m.length + 1;
  const status = showStatus && (
    <p
      class={classnames("status", t === 0 ? "A" : "B", {
        playing: board.p,
        win,
      })}
    >
      {!win && <span class="turnNumber">{turnNumber}. </span>}
      {aWin ? (
        <Text id="status.aWin" fields={{ turns: board.m.length }} />
      ) : bWin ? (
        <Text id="status.bWin" fields={{ turns: board.m.length }} />
      ) : alreadyPlayed < 4 ? (
        t === 0 ? (
          <Text id="status.aDrop" fields={{ piece: alreadyPlayed + 1 }} />
        ) : (
          <Text id="status.bDrop" fields={{ piece: alreadyPlayed + 1 }} />
        )
      ) : board.p ? (
        selected === undefined && botSelection === undefined ? (
          t === 0 ? (
            <Text id="status.aMoveFrom" />
          ) : (
            <Text id="status.bMoveFrom" />
          )
        ) : t === 0 ? (
          <Text id="status.aMoveTo" />
        ) : (
          <Text id="status.bMoveTo" />
        )
      ) : botSelection !== undefined ? (
        t === 0 ? (
          <Text id="status.aMoveTo" />
        ) : (
          <Text id="status.bMoveTo" />
        )
      ) : t === 0 ? (
        <Text id="status.aMove" />
      ) : (
        <Text id="status.bMove" />
      )}
    </p>
  );

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${-LARGE_CROWN_RADIUS} ${-LARGE_CROWN_RADIUS} ${
          4 + 2 * LARGE_CROWN_RADIUS
        } ${4 + 2 * LARGE_CROWN_RADIUS}`}
        className={classnames("board", klass)}
        ref={svgRef}
      >
        <defs>
          <marker
            id="arrowheadA"
            markerWidth="2"
            markerHeight="2"
            refX="1"
            refY="1"
            orient="auto"
          >
            <polygon points="0 0, 2 1, 0 2" />
          </marker>
          <marker
            id="arrowheadB"
            markerWidth="2"
            markerHeight="2"
            refX="1"
            refY="1"
            orient="auto"
          >
            <polygon points="0 0, 2 1, 0 2" />
          </marker>
        </defs>

        {BoardBackground}
        <g>
          {lastAction === undefined ? (
            <></>
          ) : Array.isArray(lastAction) ? (
            <line
              x1={x(lastAction[0])}
              y1={y(lastAction[0])}
              x2={x(lastAction[1])}
              y2={y(lastAction[1])}
              class={classnames("last", t === 0 ? "B" : "A")}
            />
          ) : (
            <circle
              key="lplace"
              r={LAST_ACTION_RADIUS}
              cx={lastAction % 5}
              cy={Math.floor(lastAction / 5)}
              class={classnames("last", t === 0 ? "B" : "A")}
            />
          )}
        </g>

        <g>
          {POS_ARRAY.map((pos) => (
            <circle
              key={`m${pos}`}
              r={LINE_MARGIN}
              cx={x(pos)}
              cy={y(pos)}
              class="lineMargin"
            />
          ))}
        </g>

        <g>
          {(selected || botSelection !== undefined) && (
            <circle
              key="selected"
              r={LARGE_CROWN_RADIUS}
              cx={x(selected ?? botSelection!)}
              cy={y(selected ?? botSelection!)}
              class="selected"
            />
          )}
        </g>

        <g>
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
                  : (placing || selected !== undefined) && validTargets.has(pos)
                  ? "target"
                  : undefined,
                t === 0 ? "A" : "B"
              )}
            />
          ))}
        </g>

        <g>
          {drawableArrows.map(({ from, to, player }) => {
            const deltas = DIRECTION_TO_DELTAS[DELTA_TO_DIRECTIONS[to - from]];
            const x1 = x(from);
            const y1 = y(from);
            return (
              <line
                marker-end={`url(#arrowhead${player === Player.A ? "A" : "B"})`}
                x1={x1}
                y1={y1}
                x2={x1 + deltas.dx * 0.8}
                y2={y1 + deltas.dy * 0.8}
                class={classnames("arrow", {
                  A: player === Player.A,
                  B: player === Player.B,
                })}
              />
            );
          })}
        </g>

        <g>
          {!placing &&
            selected === undefined &&
            [...validTargets].map((pos) => (
              <circle
                key={`target${pos}`}
                r={LARGE_CROWN_RADIUS}
                cx={x(pos)}
                cy={y(pos)}
                class={classnames("target", t === 0 ? "A" : "B")}
              />
            ))}

          {POS_ARRAY.map((pos) => (
            <circle
              key={`click${pos}`}
              r={PIECE_RADIUS}
              cx={x(pos)}
              cy={y(pos)}
              fill="#00000000" // invisible
              onClick={() => click(pos)}
            />
          ))}
        </g>

        <g>
          {[...aPieces, ...bPieces].map((pos) => {
            return (
              <Piece
                key={`piece${pos}`}
                position={pos}
                aspect={aspect}
                dragStart={() => {
                  setSelected(pos);
                  setDragTurn(t);
                }}
                dragMove={({ x, y }) => {
                  if (t === dragTurn) setDragState({ x, y });
                }}
                dragEnd={(position) => {
                  setDragState(undefined);
                  if (t === dragTurn && emptyNeighborsOfSelected.has(position))
                    click(position);
                  else setSelected(undefined);
                }}
                player={aPieces.has(pos) ? Player.A : Player.B}
                selected={selected === pos && ourPieces.has(selected)}
                selectable={!placing && ourPieces.has(pos)}
                click={() => click(pos)}
              />
            );
          })}
        </g>
        <g>
          {dragState && selected && (
            <Piece
              dummy
              key="dummy"
              player={t === 0 ? Player.A : Player.B}
              position={selected}
              offset={{ x: dragState.x, y: dragState.y }}
            />
          )}
        </g>

        {analysis && analysis.length > 0 && (
          <g class="analysis">
            {(() => {
              // Use actual game state for analysis, not local player's turn
              const isPlacementPhase = allPieces.size < 8;

              // Convert number to subscript
              const toSubscript = (n: number): string => {
                const subscripts = "₀₁₂₃₄₅₆₇₈₉";
                return String(n)
                  .split("")
                  .map((d) => subscripts[parseInt(d)])
                  .join("");
              };

              // Format score with symbol and subscript number
              const scoreDisplay = (score: number) => {
                const moves = formatScore(score);
                if (moves !== null) {
                  // Forced win/loss - show moves to outcome
                  if (score > 0) return `✓${toSubscript(moves)}`;
                  return `✗${toSubscript(moves)}`;
                }
                // Heuristic score - show strength as +/- subscript
                if (score > 0) return `+${toSubscript(score)}`;
                if (score < 0) return `−${toSubscript(-score)}`;
                return "=";
              };

              const bestScore = Math.max(...analysis.map((m) => m.score));

              if (isPlacementPhase) {
                // Show scores on empty slots during placement
                return analysis.map((m) => (
                  <text
                    key={m.to}
                    x={x(m.to)}
                    y={y(m.to)}
                    class="analysisScore"
                    fill={m.score === bestScore ? "#0f0" : "white"}
                  >
                    {scoreDisplay(m.score)}
                  </text>
                ));
              } else {
                const effectiveSelection = selected ?? botSelection;
                if (effectiveSelection === undefined) {
                  // Show best score for each movable piece
                  const pieceScores = new Map<number, number>();
                  for (const m of analysis) {
                    if (m.from !== undefined) {
                      const current = pieceScores.get(m.from);
                      if (current === undefined || m.score > current) {
                        pieceScores.set(m.from, m.score);
                      }
                    }
                  }
                  return [...pieceScores].map(([pos, score]) => (
                    <text
                      key={pos}
                      x={x(pos)}
                      y={y(pos)}
                      class="analysisScore"
                      fill={score === bestScore ? "#0f0" : "white"}
                    >
                      {scoreDisplay(score)}
                    </text>
                  ));
                } else {
                  // Show scores on destination squares for selected piece (user or bot)
                  const pieceMoves = analysis.filter(
                    (m) => m.from === effectiveSelection
                  );
                  const pieceBest = Math.max(...pieceMoves.map((m) => m.score));
                  return pieceMoves.map((m) => (
                    <text
                      key={m.to}
                      x={x(m.to)}
                      y={y(m.to)}
                      class="analysisScore"
                      fill={m.score === pieceBest ? "#0f0" : "white"}
                    >
                      {scoreDisplay(m.score)}
                    </text>
                  ));
                }
              }
            })()}
          </g>
        )}
      </svg>
      {status}
    </>
  );
};
