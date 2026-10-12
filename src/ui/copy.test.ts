import { describe, expect, it } from 'vitest';
import { MODE_LABELS, MODE_OPTIONS } from './copy';

const sources = import.meta.glob(
  ['./**/*.ts', './**/*.tsx', '!./**/*.test.ts', '!./**/*.test.tsx'],
  {
    eager: true,
    query: '?raw',
    import: 'default',
  },
) as Record<string, string>;

const FORBIDDEN = /board|\btun(?:e|ed|ing)\b|untuned|sandbox/i;

describe('interface copy', () => {
  it('reads the source of the whole ui layer', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20);
  });

  it.each(Object.entries(sources))('%s never says board, tune or sandbox', (_path, source) => {
    const withoutKeyboard = source.replace(/keyboard/gi, '');
    expect(withoutKeyboard).not.toMatch(FORBIDDEN);
  });

  it('names the two modes Open pitch and FM mode', () => {
    expect(MODE_LABELS).toEqual({ open: 'Open pitch', fm: 'FM mode' });
    expect(MODE_OPTIONS.map((option) => option.label)).toEqual(['Open pitch', 'FM mode']);
  });
});
