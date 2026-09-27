import { useSyncExternalStore } from "react";
import type { PaintingStyle } from "./styles";

type State = {
  ready: boolean;
  webglFailed: boolean;
  hovered: number | null;
  open: number | null;
  sound: boolean;
  /** Null until the page has told the store which region it is. */
  style: PaintingStyle | null;
};

let state: State = { ready: false, webglFailed: false, hovered: null, open: null, sound: false, style: null };
const listeners = new Set<() => void>();

export function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function getState() {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(state),
  );
}
