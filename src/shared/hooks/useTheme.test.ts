import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { THEME_STORAGE_KEY, useTheme } from './useTheme';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  mockMatchMedia(false);
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('useTheme', () => {
  it('initializes from localStorage when a theme is stored', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('initializes from the system preference when nothing is stored', () => {
    const { result: light } = renderHook(() => useTheme());
    expect(light.current.theme).toBe('light');

    mockMatchMedia(true);
    const { result: dark } = renderHook(() => useTheme());
    expect(dark.current.theme).toBe('dark');
    expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
  });

  it('prefers the stored theme over the system preference', () => {
    mockMatchMedia(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('toggling flips the theme, writes localStorage and stamps data-theme', () => {
    const { result } = renderHook(() => useTheme());
    expect(document.documentElement.dataset.theme).toBeUndefined();

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
