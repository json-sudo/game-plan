import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from './chrome/TopBar';
import { MODE_LABELS, MODE_OPTIONS, OPEN_PITCH_HINT } from './copy';

beforeEach(() => {
  window.matchMedia = vi
    .fn<() => { matches: boolean }>()
    .mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

describe('interface copy', () => {
  it('names the two modes Open pitch and FM mode', () => {
    expect(MODE_LABELS).toEqual({ open: 'Open pitch', fm: 'FM mode' });
    expect(MODE_OPTIONS.map((option) => option.label)).toEqual(['Open pitch', 'FM mode']);
  });

  it('uses pitch and tactic labels in TopBar', () => {
    render(<TopBar canUndo canRedo canReset onCopyJson={() => undefined} />);
    expect(screen.getByText('Open pitch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share tactic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy tactic JSON' })).toBeInTheDocument();
  });

  it('includes approved copy-review strings in the copy deck', () => {
    expect(OPEN_PITCH_HINT).toBe(
      'Places both teams attack against defence, with space between them.',
    );
  });
});
