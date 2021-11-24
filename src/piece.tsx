import { Position, useDraggable } from "./draggable/useDraggable";
import { Rect } from "./draggable/useRect";
import { FunctionComponent, h } from "preact";
import { SIZE } from "./logic";
import classnames from "classnames";
import { LARGE_CROWN_RADIUS, PIECE_RADIUS } from "./sizing";

export enum Color {
  A,
  B,
}

type PieceAttrs = {
  position: number;
  click?: () => void;
  dragStart?: () => void;
  dragMove?: (delta: Position) => void;
  dragEnd?: (newPosition: number) => void;
  color: Color;
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
  color,
  aspect,
  selectable,
  selected,
  dummy,
  offset,
}: PieceAttrs) => {
  const x = position % SIZE;
  const y = Math.floor(position / SIZE);

  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, state } =
    useDraggable({
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
    });

  const dxNorm = state.isDragging && aspect ? state.dx / aspect.width : 0;
  const dyNorm = state.isDragging && aspect ? state.dy / aspect.height : 0;

  function limit(n: number) {
    return Math.max(0, Math.min(n, SIZE - 1));
  }

  return (
    <circle
      onClick={click}
      r={dummy ? LARGE_CROWN_RADIUS : PIECE_RADIUS}
      cx={limit(x + dxNorm + (offset?.x ?? 0))}
      cy={limit(y + dyNorm + (offset?.y ?? 0))}
      class={classnames("piece", {
        A: color === Color.A,
        B: color === Color.B,
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
