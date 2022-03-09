import { useRef, useState } from "preact/hooks";

export function useTimer({
  enable,
  duration,
  callback,
}: {
  enable?: boolean;
  duration?: number;
  callback?: (tick: number) => any;
}) {
  const [state, setState] = useState(0);
  const ref = useRef(0);
  const timer = useRef<undefined | ReturnType<typeof setInterval>>(undefined);

  function bump() {
    if (callback) {
      ref.current++;
      callback(ref.current);
    } else {
      setState((s) => s + 1);
    }
  }

  function tick() {
    if (timer.current !== undefined) bump();
  }

  function cancel() {
    if (timer.current !== undefined) clearInterval(timer.current);
    timer.current = undefined;
  }

  if (duration && enable && timer.current === undefined) {
    timer.current = setInterval(tick, duration);
  } else if ((!duration || !enable) && timer.current != null) {
    cancel();
  }
  return { state, cancel };
}
