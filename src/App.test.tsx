import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function viewport(width: number) {
  window.matchMedia = vi
    .fn<
      (query: string) => {
        matches: boolean;
        addEventListener: () => void;
        removeEventListener: () => void;
      }
    >()
    .mockImplementation((query) => {
      const max = Number(/max-width: (\d+)px/.exec(query)?.[1]);
      return {
        matches: width <= max,
        addEventListener: vi.fn<() => void>(),
        removeEventListener: vi.fn<() => void>(),
      };
    }) as unknown as typeof window.matchMedia;
}

async function renderAppAt(width: number) {
  viewport(width);
  vi.resetModules();
  const { default: App } = await import('./App');
  return render(<App />);
}

beforeEach(() => {
  vi.stubEnv('DEV', false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('App', () => {
  it('renders the phone board at 390px', async () => {
    await renderAppAt(390);
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('renders the desktop board at 1440px', async () => {
    await renderAppAt(1440);
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});
