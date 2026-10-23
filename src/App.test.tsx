import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function viewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
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
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('App', () => {
  it('renders the phone board at 390px', async () => {
    await renderAppAt(390);
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
  });

  it('opens the FM example on a first visit and the empty open pitch on a later one', async () => {
    const first = await renderAppAt(1440);
    expect(screen.getByRole('radio', { name: 'FM mode' })).toHaveAttribute('aria-checked', 'true');
    first.unmount();
    expect(localStorage.getItem('game-plan:visited')).toBe('1');
    await renderAppAt(1440);
    expect(screen.getByRole('radio', { name: 'Open pitch' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('opens a new-format share link in the mode it was made in', async () => {
    const { createExampleTactic } = await import('./state/tactic');
    const { encodeShareHash } = await import('./share');
    const encoded = encodeShareHash({ tactic: createExampleTactic(), mode: 'openPitch' });
    if (encoded.status !== 'ok') throw new Error('expected a link');
    window.location.hash = encoded.hash;
    await renderAppAt(1440);
    expect(screen.getByRole('radio', { name: 'Open pitch' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('shows the old-link banner, clears the link and keeps the usual visit', async () => {
    localStorage.setItem('game-plan:visited', '1');
    window.location.hash = '#s=v3.abc';
    await renderAppAt(1440);
    expect(screen.getByRole('alert')).toHaveTextContent('This link is from the old Game Plan.');
    expect(window.location.hash).toBe('');
    expect(screen.getByRole('radio', { name: 'Open pitch' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears a valid share link after opening it', async () => {
    const { createExampleTactic } = await import('./state/tactic');
    const { encodeShareHash } = await import('./share');
    const encoded = encodeShareHash({ tactic: createExampleTactic(), mode: 'fm' });
    if (encoded.status !== 'ok') throw new Error('expected a link');
    window.location.hash = encoded.hash;
    await renderAppAt(1440);
    expect(window.location.hash).toBe('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the skipped-saves banner for an unreadable save', async () => {
    localStorage.setItem('game-plan:visited', '1');
    localStorage.setItem('gameplan:tactics', JSON.stringify({ version: 5, slots: [{ nope: 1 }] }));
    await renderAppAt(1440);
    expect(screen.getByRole('alert')).toHaveTextContent('1 saved tactic was skipped.');
  });

  it('renders the desktop board at 1440px', async () => {
    await renderAppAt(1440);
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});
