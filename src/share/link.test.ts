import { describe, expect, it } from 'vitest';
import { createExampleTactic } from '../state/tactic';
import { decodeShareHash } from './codec';
import { buildShareLink } from './link';

describe('buildShareLink', () => {
  it('builds a link on the current page that decodes to the same tactic', () => {
    const tactic = createExampleTactic();
    const result = buildShareLink(
      { tactic, mode: 'fm' },
      { origin: 'https://gameplan.app', pathname: '/play', search: '?a=1' },
    );
    if (result.status !== 'ok') throw new Error('expected a link');
    expect(result.url.startsWith('https://gameplan.app/play?a=1#s=')).toBe(true);
    const hash = result.url.slice(result.url.indexOf('#'));
    expect(decodeShareHash(hash)).toEqual({ status: 'ok', tactic, mode: 'fm' });
  });
});
