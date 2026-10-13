/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTokenFiles } from '../../../scripts/generate-tokens.mjs';
import { PHONE_MAX_WIDTH } from '../constants/breakpoints';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const breakpointsScss = read('./_breakpoints.scss');
const tokensScss = read('./tokens.scss');
const sourceJson = read('../../../design/tokens.json');

interface Token {
  name: string;
  value: string | { light: string; dark: string };
}

interface Style {
  name: string;
  letterSpacing?: string;
}

interface Source {
  color: { tokens: Token[] };
  shadow: { tokens: Token[] };
  spacing: { tokens: Token[] };
  radius: { tokens: Token[] };
  duration: { tokens: Token[] };
  size: { tokens: Token[] };
  type: { families: Record<string, string>; groups: { styles: Style[] }[] };
}

const source: Source = JSON.parse(sourceJson);

function themeBlock(theme: 'light' | 'dark'): string {
  const start = tokensScss.indexOf(`@mixin theme-${theme} {`);
  return tokensScss.slice(start, tokensScss.indexOf('\n}', start));
}

function resolved(value: string): string {
  const alias = /^\{([a-z0-9-]+)\}$/.exec(value);
  return alias ? `var(--${alias[1]})` : value;
}

const themed = [...source.color.tokens, ...source.shadow.tokens];
const scalar = [
  ...source.spacing.tokens,
  ...source.radius.tokens,
  ...source.duration.tokens,
  ...source.size.tokens,
];
const styles = source.type.groups.flatMap((group) => group.styles);

describe('generated tokens', () => {
  it('is up to date with design/tokens.json', () => {
    const built = buildTokenFiles(source);
    expect(tokensScss).toBe(built.tokens);
    expect(breakpointsScss).toBe(built.breakpoints);
  });

  it.each(themed)('declares $name in both theme blocks with its value', (token) => {
    const value = token.value as { light: string; dark: string };
    expect(themeBlock('light')).toContain(`--${token.name}: ${resolved(value.light)};`);
    expect(themeBlock('dark')).toContain(`--${token.name}: ${resolved(value.dark)};`);
  });

  it.each(scalar)('declares $name once on the root', (token) => {
    expect(tokensScss).toContain(`--${token.name}: ${token.value};`);
  });

  it.each(styles)('declares the $name type style', (style) => {
    expect(tokensScss).toContain(`--type-${style.name}: `);
  });

  it.each(styles.filter((style) => style.letterSpacing))(
    'declares the $name letter spacing',
    (style) => {
      expect(tokensScss).toContain(`--type-${style.name}-letter-spacing: ${style.letterSpacing};`);
    },
  );

  it.each(Object.keys(source.type.families))('declares the %s font family', (key) => {
    expect(tokensScss).toContain(`--font-${key}: `);
  });

  it('resolves aliases to custom property references', () => {
    expect(tokensScss).not.toMatch(/\{[a-z0-9-]+\}/);
    expect(themeBlock('light')).toContain('--zone-selected: var(--accent);');
    expect(themeBlock('dark')).toContain('--token-selected: var(--focus-ring);');
  });

  it('applies the dark block through data-theme and the system preference', () => {
    expect(tokensScss).toContain(":root[data-theme='dark'] {\n    @include theme-dark;");
    expect(tokensScss).toContain('@media (prefers-color-scheme: dark)');
    expect(tokensScss).toContain(":root:not([data-theme='light'])");
  });

  it('keeps the phone breakpoint in sync between Sass and TypeScript', () => {
    expect(breakpointsScss).toContain(`$phone-max: ${PHONE_MAX_WIDTH}px;`);
  });
});
