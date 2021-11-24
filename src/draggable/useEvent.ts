import { useEffect } from "preact/hooks";

export type EventHandler = (e: Event) => any;

export function useEvent(event: string, handler: EventHandler): void;
export function useEvent(
  rootObject: any,
  eventName: string | EventHandler,
  handler?: EventHandler
): void;
export function useEvent(
  rootObject: any,
  eventName: string | EventHandler,
  handler?: EventHandler
): void {
  const root =
    typeof rootObject == "string"
      ? typeof window != "undefined"
        ? window
        : null
      : rootObject;
  const event =
    typeof rootObject == "string"
      ? rootObject
      : typeof eventName == "string"
      ? eventName
      : null;
  const handlerFunction: EventHandler | undefined =
    typeof eventName == "string" ? handler : eventName;
  return useEffect(() => {
    if (root && event && handlerFunction) {
      root.addEventListener(event, handlerFunction as any);
    }
    return () => root.removeEventListener(event, handlerFunction as any);
  }, []);
}
