import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBar } from './chrome/TopBar';
import { FirstRunHint } from './feedback/FirstRunHint';
import { MODE_LABELS, MODE_OPTIONS } from './copy';

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
    render(<TopBar canUndo canRedo canReset />);
    expect(screen.getByText('Open pitch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share tactic' })).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\bboard\b/i);
    expect(text).not.toMatch(/\btun(?:e|ed|ing)\b/i);
    expect(text).not.toMatch(/\bsandbox\b/i);
  });

  it('uses pitch terminology in FirstRunHint', () => {
    render(<FirstRunHint />);
    expect(screen.getByText('Tap a zone on the map.')).toBeInTheDocument();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\bboard\b/i);
    expect(text).not.toMatch(/\btun(?:e|ed|ing)\b/i);
    expect(text).not.toMatch(/\bsandbox\b/i);
  });
});
