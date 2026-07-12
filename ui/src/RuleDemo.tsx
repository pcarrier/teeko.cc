import classnames from "classnames";
import { FunctionComponent } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { Localizer, Text } from "preact-i18n";
import { FontAwesomeIcon } from "@aduh95/preact-fontawesome";
import { faRotateBack } from "@fortawesome/free-solid-svg-icons/faRotateBack";
import { Player, SLOTS, x, y } from "teeko-cc-common/src/model.js";
import { BoardBackground } from "./BoardView";
import { winShape } from "./winShape";
import {
  LARGE_CROWN_RADIUS,
  LINE_MARGIN,
  PIECE_RADIUS,
  SLOT_RADIUS,
} from "./sizing";

const POS_ARRAY = Array.from(Array(SLOTS).keys());

type DemoPiece = { id: number; player: Player; pos: number };

export type Frame = {
  pieces: DemoPiece[];
  selected?: number;
  targets?: number[];
  win?: number[];
  clear?: boolean;
  ms: number;
};

class DemoBuilder {
  frames: Frame[] = [];
  private pieces: DemoPiece[] = [];
  private id = 0;

  private frame(ms: number, extra: Omit<Frame, "pieces" | "ms"> = {}): this {
    this.frames.push({
      pieces: this.pieces.map((p) => ({ ...p })),
      ms,
      ...extra,
    });
    return this;
  }

  place(player: Player, pos: number, ms = 700): this {
    this.pieces.push({ id: this.id++, player, pos });
    return this.frame(ms);
  }

  placeAll(placements: [Player, number][], ms = 1100): this {
    for (const [player, pos] of placements)
      this.pieces.push({ id: this.id++, player, pos });
    return this.frame(ms);
  }

  select(pos: number, targets: number[], ms = 1400): this {
    return this.frame(ms, { selected: pos, targets });
  }

  move(from: number, to: number, ms = 1100): this {
    const piece = this.pieces.find((p) => p.pos === from);
    if (piece) piece.pos = to;
    return this.frame(ms);
  }

  win(positions: number[], ms = 2600): this {
    return this.frame(ms, { win: positions });
  }

  pause(ms: number): this {
    return this.frame(ms);
  }

  wipe(): this {
    this.frame(600, { clear: true });
    this.pieces = [];
    return this.frame(400);
  }
}

const A = Player.A;
const B = Player.B;

// Same 8 placements open every demo phase, for continuity.
const OPENING: [Player, number][] = [
  [A, 12],
  [B, 7],
  [A, 17],
  [B, 11],
  [A, 13],
  [B, 16],
  [A, 6],
  [B, 18],
];

export const placeDemo = OPENING.reduce(
  (b, [player, pos]) => b.place(player, pos),
  new DemoBuilder()
)
  .pause(1800)
  .wipe().frames;

export const moveDemo = new DemoBuilder()
  .placeAll(OPENING)
  .select(6, [0, 1, 2, 5, 10])
  .move(6, 2)
  .select(18, [14, 19, 22, 23, 24])
  .move(18, 19)
  .pause(1400)
  .wipe().frames;

export const winDemo = new DemoBuilder()
  // Straight line of 4.
  .placeAll([
    [A, 5],
    [A, 6],
    [A, 7],
    [A, 13],
    [B, 3],
    [B, 10],
    [B, 16],
    [B, 19],
  ])
  .move(13, 8)
  .win([5, 6, 7, 8])
  .wipe()
  // Small square.
  .placeAll([
    [B, 11],
    [B, 12],
    [B, 16],
    [B, 13],
    [A, 2],
    [A, 3],
    [A, 8],
    [A, 21],
  ])
  .move(13, 17)
  .win([11, 12, 16, 17])
  .wipe()
  // Diagonal line of 4.
  .placeAll([
    [A, 6],
    [A, 12],
    [A, 18],
    [A, 1],
    [B, 5],
    [B, 9],
    [B, 13],
    [B, 22],
  ])
  .move(1, 0)
  .win([0, 6, 12, 18])
  .wipe().frames;

export const RuleDemo: FunctionComponent<{ frames: Frame[] }> = ({
  frames,
}) => {
  const [i, setI] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setI((i + 1) % frames.length), frames[i].ms);
    return () => clearTimeout(t);
  }, [i, cycle, frames]);

  const total = useMemo(
    () => frames.reduce((sum, f) => sum + f.ms, 0),
    [frames]
  );
  const elapsed = useMemo(() => {
    let sum = 0;
    for (let j = 0; j <= i; j++) sum += frames[j].ms;
    return sum;
  }, [i, frames]);

  const restart = () => {
    setI(0);
    setCycle(cycle + 1);
  };

  const f = frames[i];
  const prev = frames[(i + frames.length - 1) % frames.length];
  const prevIds = new Set(prev.pieces.map((p) => p.id));

  const selectedPlayer =
    f.selected === undefined
      ? undefined
      : f.pieces.find((p) => p.pos === f.selected)?.player;
  const winPos = f.win?.[0];
  const winPlayer =
    winPos === undefined
      ? undefined
      : f.pieces.find((p) => p.pos === winPos)?.player;
  const shape = f.win && winShape(f.win);

  let entering = 0;

  return (
    <div class="demoWrap">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`${-LARGE_CROWN_RADIUS} ${-LARGE_CROWN_RADIUS} ${
          4 + 2 * LARGE_CROWN_RADIUS
        } ${4 + 2 * LARGE_CROWN_RADIUS}`}
        class="board demo"
        aria-hidden="true"
      >
        {BoardBackground}
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
          {POS_ARRAY.map((pos) => (
            <circle
              key={`bg${pos}`}
              r={SLOT_RADIUS}
              cx={x(pos)}
              cy={y(pos)}
              class="bg"
            />
          ))}
        </g>
        {f.selected !== undefined && (
          <circle
            r={LARGE_CROWN_RADIUS}
            cx={x(f.selected)}
            cy={y(f.selected)}
            class="selected"
          />
        )}
        {f.targets?.map((pos) => (
          <circle
            key={`t${pos}`}
            r={0.14}
            cx={x(pos)}
            cy={y(pos)}
            class={classnames("demoTarget", {
              A: selectedPlayer === Player.A,
              B: selectedPlayer === Player.B,
            })}
          />
        ))}
        <g
          key={`c${cycle}`}
          class={classnames("demoPieces", {
            clearing: f.clear,
            winning: f.win,
          })}
        >
          {f.pieces.map((piece) => {
            const isNew = !prevIds.has(piece.id);
            const delay = isNew ? `${entering++ * 70}ms` : undefined;
            return (
              <g
                key={piece.id}
                class="demoPiece"
                style={{
                  transform: `translate(${x(piece.pos)}px, ${y(piece.pos)}px)`,
                }}
              >
                <circle
                  r={PIECE_RADIUS}
                  class={classnames("piece", {
                    A: piece.player === Player.A,
                    B: piece.player === Player.B,
                    pop: isNew,
                    winner: f.win?.includes(piece.pos),
                  })}
                  style={delay ? { animationDelay: delay } : undefined}
                />
              </g>
            );
          })}
        </g>
        {shape &&
          (shape.kind === "line" ? (
            <line
              class={classnames("winShape", {
                A: winPlayer === Player.A,
                B: winPlayer === Player.B,
              })}
              pathLength={1}
              x1={x(shape.from)}
              y1={y(shape.from)}
              x2={x(shape.to)}
              y2={y(shape.to)}
            />
          ) : (
            <polygon
              class={classnames("winShape", {
                A: winPlayer === Player.A,
                B: winPlayer === Player.B,
              })}
              pathLength={1}
              points={shape.corners
                .map((pos) => `${x(pos)},${y(pos)}`)
                .join(" ")}
            />
          ))}
      </svg>
      <div class="demoControls">
        <div class="demoProgress">
          <div
            class="demoProgressFill"
            style={{
              width: `${(100 * elapsed) / total}%`,
              transitionDuration: `${f.ms}ms`,
            }}
          />
        </div>
        <Localizer>
          <button
            class="icon demoRestart"
            onClick={restart}
            aria-label={<Text id="buttons.restart" />}
          >
            <FontAwesomeIcon icon={faRotateBack} />
          </button>
        </Localizer>
      </div>
    </div>
  );
};
