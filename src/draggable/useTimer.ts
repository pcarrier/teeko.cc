import { useState, useRef } from "preact/hooks";

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
  const timer = useRef(null);
  function bump() {
    if (callback) {
      ref.current++;
      callback(ref.current);
    } else {
      setState((s) => s + 1);
    }
  }
  function tick() {
    if (timer.current != null) bump();
  }
  function cancel() {
    clearInterval(timer.current);
    timer.current = null;
  }
  if (duration && enable && timer.current == null) {
    timer.current = setInterval(tick, duration);
  } else if ((!duration || !enable) && timer.current != null) {
    cancel();
  }
  return { state, cancel };
}
