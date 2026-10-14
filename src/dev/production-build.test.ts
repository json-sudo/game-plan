import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const GALLERY_MARKER = 'Game Plan · component review';
const BUILD_TIMEOUT_MS = 120_000;

describe('production build', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'gp-build-'));
  afterAll(() => rmSync(outDir, { recursive: true, force: true }));

  it(
    'contains no gallery code',
    () => {
      execFileSync(
        'npx',
        ['vite', 'build', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'silent'],
        {
          env: { ...process.env, NODE_ENV: 'production' },
          stdio: 'pipe',
        },
      );
      const assets = readdirSync(join(outDir, 'assets'));
      expect(assets.some((file) => /gallery/i.test(file))).toBe(false);
      for (const file of assets.filter((name) => name.endsWith('.js'))) {
        expect(readFileSync(join(outDir, 'assets', file), 'utf8')).not.toContain(GALLERY_MARKER);
      }
    },
    BUILD_TIMEOUT_MS,
  );
});
