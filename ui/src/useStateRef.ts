import { MutableRef, StateUpdater, useRef, useState } from "preact/hooks";

export function useStateRef<T>(init: T): [MutableRef<T>, StateUpdater<T>] {
  const [v, setter] = useState<T>(init);
  const ref = useRef<T>(v);
  ref.current = v;
  return [ref, setter];
}
