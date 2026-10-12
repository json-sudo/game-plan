export const HISTORY_LIMIT = 50;

export interface History<T> {
  past: readonly T[];
  future: readonly T[];
}

export interface HistoryStep<T> {
  present: T;
  history: History<T>;
}

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [] };
}

export function commit<T>(history: History<T>, previous: T, limit = HISTORY_LIMIT): History<T> {
  return { past: [...history.past, previous].slice(-limit), future: [] };
}

export function undo<T>(history: History<T>, present: T): HistoryStep<T> | null {
  if (history.past.length === 0) return null;
  return {
    present: history.past[history.past.length - 1],
    history: { past: history.past.slice(0, -1), future: [present, ...history.future] },
  };
}

export function redo<T>(history: History<T>, present: T): HistoryStep<T> | null {
  if (history.future.length === 0) return null;
  return {
    present: history.future[0],
    history: { past: [...history.past, present], future: history.future.slice(1) },
  };
}
