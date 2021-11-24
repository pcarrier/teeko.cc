import { useRef } from "preact/hooks";

export type AnyFunction = (...args: any[]) => any;

function debounce(d: number, f: AnyFunction) {
  let t: undefined | ReturnType<typeof setTimeout> = undefined;
  return (...args: any[]) => {
    if (t !== undefined) clearTimeout(t);
    t = setTimeout(() => {
      f?.(...args);
    }, d);
  };
}

export function useDebounced(fn: AnyFunction, delay: number): AnyFunction {
  if (!delay) return fn;
  const ref = useRef<AnyFunction>(debounce(delay, fn));
  return ref.current;
}
