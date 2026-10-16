import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useBoardMetrics } from './use-board-metrics';

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

beforeEach(() => setViewport(1366, 680));
afterEach(() => setViewport(1024, 768));

describe('useBoardMetrics', () => {
  it('reads the current viewport', () => {
    const { result } = renderHook(() => useBoardMetrics());
    expect(result.current.layout).toBe('three');
    expect(result.current.pitchH).toBe(596);
  });

  it('recomputes on resize', () => {
    const { result } = renderHook(() => useBoardMetrics());
    act(() => {
      setViewport(390, 844);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.layout).toBe('phone');
    expect(result.current.pitchW).toBe(358);
  });
});
