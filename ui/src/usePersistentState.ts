import { useState, useCallback } from "preact/hooks";

type Deserializer<T> = (value: string | null) => T;

export function usePersistentState<T>(
  key: string,
  fallback: T,
  deserialize?: Deserializer<T>
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    if (deserialize) return deserialize(stored);
    return stored !== null ? (stored as unknown as T) : fallback;
  });

  const setPersistentState = useCallback(
    (value: T) => {
      localStorage.setItem(key, String(value));
      setState(value);
    },
    [key]
  );

  return [state, setPersistentState];
}

// Common deserializers
export const boolDeserialize = (value: string | null): boolean =>
  value === "true";

export const intDeserialize =
  (fallback: number) =>
  (value: string | null): number =>
    value !== null ? parseInt(value, 10) || fallback : fallback;

export const stringDeserialize =
  <T extends string>(fallback: T) =>
  (value: string | null): T =>
    (value as T) || fallback;
