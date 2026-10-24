// @vitest-environment node
import { describe, expect, it } from 'vitest';

const modules = import.meta.glob(['./**/*.ts', '!./**/*.test.ts'], { eager: true });

describe('engine purity', () => {
  it('runs without DOM globals', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof localStorage).toBe('undefined');
  });

  it('imports every engine module without touching the DOM', () => {
    const names = Object.keys(modules);
    expect(names.length).toBeGreaterThanOrEqual(10);
    expect(names).toContain('./index.ts');
  });

  it('exposes the public API from the index', async () => {
    const api = await import('./index');
    for (const name of [
      'zoneOf',
      'eligibleCarrierIds',
      'formationAnchors',
      'computeZoneShape',
      'positionAt',
    ]) {
      expect(typeof (api as Record<string, unknown>)[name]).toBe('function');
    }
  });
});
