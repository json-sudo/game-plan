import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, commit, emptyHistory, redo, undo } from './history';

describe('history', () => {
  it('starts empty', () => {
    expect(emptyHistory<number>()).toEqual({ past: [], future: [] });
  });

  it('commit pushes the previous present and clears the future', () => {
    const withFuture = { past: [1], future: [9] };
    expect(commit(withFuture, 2)).toEqual({ past: [1, 2], future: [] });
  });

  it('caps the past at the limit, dropping the oldest entries', () => {
    const history = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) => index).reduce(
      (acc, value) => commit(acc, value),
      emptyHistory<number>(),
    );
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toBe(5);
    expect(history.past[HISTORY_LIMIT - 1]).toBe(HISTORY_LIMIT + 4);
  });

  it('honours a custom limit', () => {
    const history = [1, 2, 3, 4].reduce((acc, v) => commit(acc, v, 2), emptyHistory<number>());
    expect(history.past).toEqual([3, 4]);
  });

  it('undo returns null when there is nothing to undo', () => {
    expect(undo(emptyHistory<number>(), 1)).toBeNull();
  });

  it('undo moves the present into the future and restores the last past entry', () => {
    const result = undo({ past: [1, 2], future: [] }, 3);
    expect(result).toEqual({ present: 2, history: { past: [1], future: [3] } });
  });

  it('redo returns null when there is nothing to redo', () => {
    expect(redo(emptyHistory<number>(), 1)).toBeNull();
  });

  it('redo moves the present into the past and restores the next future entry', () => {
    const result = redo({ past: [1], future: [3, 4] }, 2);
    expect(result).toEqual({ present: 3, history: { past: [1, 2], future: [4] } });
  });

  it('undo then redo returns to the same state', () => {
    const undone = undo({ past: [1, 2], future: [] }, 3)!;
    const redone = redo(undone.history, undone.present)!;
    expect(redone.present).toBe(3);
    expect(redone.history).toEqual({ past: [1, 2], future: [] });
  });

  it('does not mutate its input', () => {
    const history = Object.freeze({ past: Object.freeze([1]), future: Object.freeze([]) });
    expect(() => commit(history, 2)).not.toThrow();
    expect(() => undo(history, 2)).not.toThrow();
  });
});
