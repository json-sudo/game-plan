import { describe, expect, it } from 'vitest';
import sourceJson from '../../../design/tokens.json?raw';

type Theme = 'light' | 'dark';

interface Token {
  name: string;
  value: { light: string; dark: string };
}

const tokens: Token[] = JSON.parse(sourceJson).color.tokens;

function colour(name: string, theme: Theme): [number, number, number, number] {
  const token = tokens.find((entry) => entry.name === name);
  if (!token) throw new Error(`Unknown token ${name}`);
  const raw = token.value[theme];
  const alias = /^\{([a-z0-9-]+)\}$/.exec(raw);
  if (alias) return colour(alias[1], theme);
  if (raw.startsWith('rgba')) {
    const [r, g, b, a] = raw.match(/[\d.]+/g)!.map(Number);
    return [r, g, b, a];
  }
  const hex = raw.slice(1);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(1) as [
    number,
    number,
    number,
    number,
  ];
}

function luminance([r, g, b]: number[]): number {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(foreground: string, background: string, theme: Theme): number {
  const a = luminance(colour(foreground, theme));
  const b = luminance(colour(background, theme));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const THEMES: Theme[] = ['light', 'dark'];
const SURFACES = ['surface-body', 'surface-panel', 'surface-raised'];

const text: [string, string][] = [
  ...SURFACES.flatMap((surface): [string, string][] => [
    ['text', surface],
    ['text-muted', surface],
    ['accent-ink', surface],
  ]),
  ['accent-text', 'accent'],
  ['accent-text', 'accent-hover'],
  ['control-text', 'control'],
  ['control-text', 'control-hover'],
  ['text', 'error-surface'],
  ['error', 'error-surface'],
  ['error', 'surface-raised'],
  ['text', 'info-surface'],
  ['info', 'info-surface'],
  ['info', 'surface-panel'],
  ['pitch-label-text', 'pitch-label-plate'],
  ['team-mine-text', 'team-mine'],
  ['team-mine-keeper-text', 'team-mine-keeper'],
  ['team-opp-text', 'team-opp'],
  ['team-opp-keeper-text', 'team-opp-keeper'],
];

const graphics: [string, string][] = [
  ...SURFACES.flatMap((surface): [string, string][] => [
    ['border-strong', surface],
    ['focus-ring', surface],
  ]),
  ['focus-ring', 'pitch'],
  ['focus-ring', 'pitch-stripe'],
  ['token-ring', 'pitch'],
  ['token-ring', 'pitch-stripe'],
];

describe.each(THEMES)('%s theme contrast', (theme) => {
  it.each(text)('%s on %s meets 4.5:1', (foreground, background) => {
    expect(contrast(foreground, background, theme)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(graphics)('%s against %s meets 3:1', (foreground, background) => {
    expect(contrast(foreground, background, theme)).toBeGreaterThanOrEqual(3);
  });
});
