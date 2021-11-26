import { useRef } from "preact/hooks";
import { useStateRef } from "./useStateRef";

export type Position = {
  x: number;
  y: number;
};

export interface DragEvents {
  onDragStart: (start: Position, e: any) => any;
  onDragMove: (delta: Position, start: Position, e: any) => any;
  onDragEnd: (event: {
    start: Position;
    delta: Position;
    end: Position;
    event: any;
  }) => any;
}

export interface DraggableOptions extends Partial<DragEvents> {
  minDragDistance?: number;
  onClick?: (e: any) => any;
  onDoubleClick?: (e?: any) => any;
  onPointerEnter?: () => any;
  onPointerLeave?: () => any;
}

export type DragState = {
  isDragging: boolean;
  isPointerDown: boolean;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  px: number;
  py: number;
};

export type Draggable = {
  onPointerDown(e: PointerEvent): any;
  onPointerCancel(e: PointerEvent): any;
  onPointerMove(e: PointerEvent): any;
  onPointerUp(e: PointerEvent): any;
  onClick: (e: MouseEvent) => any;
  state: DragState;
  internalState: {
    suppressClick: boolean;
  };
};

export function useDraggable(opts?: DraggableOptions): Draggable {
  const { minDragDistance, onDragStart, onDragMove, onDragEnd } = {
    minDragDistance: 4,
    ...opts,
  };

  const hasDragDistance = !!minDragDistance;

  const [state, setState] = useStateRef<DragState>({
    isDragging: false,
    isPointerDown: false,
    x0: 0,
    y0: 0,
    dx: 0,
    dy: 0,
    px: 0,
    py: 0,
  });

  const privateState = useRef({
    suppressClick: false,
  });

  function onPointerDown(e: PointerEvent) {
    const { target, pointerId, button } = e;
    if (button != 0) return;
    (target as Element).setPointerCapture(pointerId);
    const { pageX: x0, pageY: y0 } = e;
    if (hasDragDistance) {
      setState((s) => ({
        ...s,
        x0,
        y0,
        dx: 0,
        dy: 0,
        isDragging: false,
        isPointerDown: true,
      }));
    } else {
      onDragStart?.({ x: x0, y: y0 }, e);
      setState((s) => ({
        ...s,
        x0,
        y0,
        dx: 0,
        dy: 0,
        isDragging: true,
        isPointerDown: true,
      }));
    }
  }
  function onPointerMove(e: PointerEvent) {
    const { x0, y0, isDragging: wasDragging, isPointerDown } = state.current;
    if (!isPointerDown) return;
    const dx = e.pageX - x0;
    const dy = e.pageY - y0;

    const d = Math.max(Math.abs(dx), Math.abs(dy));
    const isDragging = wasDragging || d >= minDragDistance;

    if (isDragging) {
      if (!wasDragging && hasDragDistance) {
        privateState.current.suppressClick = true;
        onDragStart?.({ x: x0, y: y0 }, e);
      }
      onDragMove?.({ x: dx, y: dy }, { x: x0, y: y0 }, e);
    }
    setState((s) => ({ ...s, dx, dy, isDragging }));
  }
  function onPointerCancel(e: PointerEvent) {
    const { target, pointerId } = e;
    (target as Element).releasePointerCapture(pointerId);
    const { isDragging: wasDragging, x0, y0 } = state?.current ?? {};
    if (wasDragging)
      onDragEnd?.({
        start: { x: x0, y: y0 },
        delta: { x: 0, y: 0 },
        end: { x: x0, y: y0 },
        event: e,
      });
    setState((s) => ({
      ...s,
      isDragging: false,
      isPointerDown: false,
      dx: 0,
      dy: 0,
      x0: 0,
      y0: 0,
    }));
  }
  function onPointerUp(e: PointerEvent) {
    const { target } = e;
    (target as Element).releasePointerCapture(e.pointerId);
    const {
      isDragging: wasDragging,
      px,
      py,
      dx,
      dy,
      x0,
      y0,
    } = state?.current || {};
    if (wasDragging) {
      onDragEnd?.({
        start: { x: x0, y: y0 },
        delta: { x: dx, y: dy },
        end: { x: x0 + dx, y: y0 + dy },
        event: e,
      });
    }
    setState((s) => ({
      ...s,
      x0: 0,
      y0: 0,
      isDragging: false,
      isPointerDown: false,
      dx: 0,
      dy: 0,
      px: px + dx,
      py: py + dy,
    }));
  }
  function onClick(e: Event) {
    const { onClick } = { ...opts };
    const { suppressClick } = privateState.current;
    if (suppressClick) {
      privateState.current.suppressClick = false;
    } else {
      onClick?.(e);
    }
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerCancel,
    onPointerUp,
    onClick,
    state: state.current,
    internalState: privateState.current,
  };
}
