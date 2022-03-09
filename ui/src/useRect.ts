import { useEffect, useRef } from "preact/hooks";
import { useStateRef } from "./useStateRef.ts";
import { RefObject } from "preact";
import { useEvent } from "./useEvent.ts";
import { useTimer } from "./useTimer.ts";
import { useDebounced } from "./useDebounced.ts";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function rectsEqual(r1: Rect | null, r2: Rect | null) {
  if (!r1 || !r2) return false;
  return (
    r1.x == r2.x &&
    r1.y == r2.y &&
    r1.width == r2.width &&
    r1.height == r2.height
  );
}

export const getRect = (element: Element): Rect | null => {
  if (!element) return null;
  if (typeof window == "undefined") return null;
  const clientRect = element.getBoundingClientRect();
  const { width, height, top, left } = clientRect;
  return {
    x: left + window.scrollX,
    y: top + window.scrollY,
    width,
    height,
  };
};

export function useRect(
  ref: RefObject<any>,
  options?: {
    scroll?: boolean;
    pollInterval?: number;
    update?: (rect: Rect | null) => any;
    adjust?: (rect: Rect, ref: RefObject<any>) => Rect;
  }
): Rect | null {
  if (!ref) throw new Error("a ref is required for useRect");
  const refFn = <T>(init: T) =>
    options?.update
      ? ([useRef<T>(init), null] as [{ current: T }, any])
      : useStateRef<T>(init);
  const [rectRef, setRectRef] = refFn<Rect | null>(null);

  function update() {
    const { current } = ref;
    if (current) {
      const next = getRect(current);
      if (!rectsEqual(rectRef.current, next)) {
        rectRef.current = next;
        const adjusted =
          options?.adjust && rectRef.current
            ? options.adjust(rectRef.current, ref)
            : rectRef.current;
        options?.update
          ? options.update(adjusted)
          : setRectRef?.(rectRef.current);
      }
    }
  }

  useEffect(update, []);
  useEvent("resize", update);
  useEvent("orientationchange", update);
  useTimer({
    enable: !!options?.pollInterval,
    duration: options?.pollInterval ?? 0,
    callback: update,
  });
  if (options?.scroll) {
    useEvent("scroll", useDebounced(update, 300));
  }
  // if (!options?.update)
  return options?.adjust && rectRef.current
    ? options.adjust(rectRef.current, ref)
    : rectRef.current;
}
