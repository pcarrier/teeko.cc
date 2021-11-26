import { useRef } from "preact/hooks";

export type AnyFunction = (...args) => any;

function debounce(d: number, f: AnyFunction) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
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
