import { FunctionComponent } from "preact";
import classnames from "classnames";
import { Player, SIZE } from "teeko-cc-common/src/model.js";
import { Position, useDraggable } from "./useDraggable.js";
import { Rect } from "./useRect.js";
import { LARGE_CROWN_RADIUS, PIECE_RADIUS } from "./sizing";

type PieceAttrs = {
  position: number;
  click?: () => void;
  dragStart?: () => void;
  dragMove?: (delta: Position) => void;
  dragEnd?: (newPosition: number) => void;
  player: Player;
  selected?: boolean;
  selectable?: boolean;
  aspect?: Rect | null;
  dummy?: boolean;
  offset?: Position;
};

export const Piece: FunctionComponent<PieceAttrs> = ({
  position,
  click,
  dragEnd,
  dragStart,
  dragMove,
  player,
  aspect,
  selectable,
  selected,
  dummy,
  offset,
}: PieceAttrs) => {
  const x = position % SIZE;
  const y = Math.floor(position / SIZE);

  const {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClick,
    state,
  } = useDraggable({
    onDragStart() {
      dragStart?.();
    },
    onDragMove(delta) {
      const x = aspect ? delta.x / aspect.width : 0;
      const y = aspect ? delta.y / aspect.height : 0;
      dragMove?.({ x, y });
    },
    onDragEnd({ delta }) {
      const dx = aspect ? delta.x / aspect.width : 0;
      const dy = aspect ? delta.y / aspect.height : 0;
      const p = Math.round(y + dy) * SIZE + Math.round(x + dx);
      dragEnd?.(p);
    },
    onClick: click,
  });

  const dxNorm =
    selectable && state.isDragging && aspect ? state.dx / aspect.width : 0;
  const dyNorm =
    selectable && state.isDragging && aspect ? state.dy / aspect.height : 0;

  function limitToBoard(n: number) {
    return Math.max(0, Math.min(n, SIZE - 1));
  }

  return (
    <circle
      key={`p${position}`}
      onClick={onClick}
      r={dummy ? LARGE_CROWN_RADIUS : PIECE_RADIUS}
      cx={limitToBoard(x + dxNorm + (offset?.x ?? 0))}
      cy={limitToBoard(y + dyNorm + (offset?.y ?? 0))}
      class={classnames("piece", {
        A: player === Player.A,
        B: player === Player.B,
        dragging: state.isDragging,
        dummy,
      })}
      {...(selectable || selected
        ? {
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
          }
        : {})}
    />
  );
};
