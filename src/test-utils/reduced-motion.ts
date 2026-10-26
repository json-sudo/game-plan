import { act } from '@testing-library/react';
import { vi } from 'vitest';

export function stubSwitchableReducedMotion(initial = false): (next: boolean) => void {
  const listeners = new Set<() => void>();
  let reduced = initial;
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return reduced && query.includes('prefers-reduced-motion');
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return (next) => {
    reduced = next;
    act(() => listeners.forEach((listener) => listener()));
  };
}
