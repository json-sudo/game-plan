import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBelowBreakpoint } from './useBelowBreakpoint';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  mockMatchMedia(false);
});

describe('useBelowBreakpoint', () => {
  it('reflects the initial matchMedia result', () => {
    mockMatchMedia(false);
    const { result: above } = renderHook(() => useBelowBreakpoint(825));
    expect(above.current).toBe(false);

    mockMatchMedia(true);
    const { result: below } = renderHook(() => useBelowBreakpoint(825));
    expect(below.current).toBe(true);
  });

  it('queries a max-width just under the given breakpoint', () => {
    renderHook(() => useBelowBreakpoint(825));
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 824.98px)');
  });

  it('does not throw when the mocked matchMedia has no addEventListener', () => {
    expect(() => renderHook(() => useBelowBreakpoint(825))).not.toThrow();
  });
});
