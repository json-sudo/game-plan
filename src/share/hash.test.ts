import { afterEach, describe, expect, it } from 'vitest';
import { createExampleTactic } from '../state/tactic';
import { encodeShareHash } from './codec';
import { clearShareHash, readShareFromLocation } from './hash';

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('readShareFromLocation', () => {
  it('returns null when the address has no share hash', () => {
    expect(readShareFromLocation()).toBeNull();
    window.location.hash = '#something-else';
    expect(readShareFromLocation()).toBeNull();
  });

  it('decodes a share hash in the address', () => {
    const tactic = createExampleTactic();
    const encoded = encodeShareHash({ tactic, mode: 'fm' });
    if (encoded.status !== 'ok') throw new Error('expected a link');
    window.location.hash = encoded.hash;
    expect(readShareFromLocation()).toEqual({ status: 'ok', tactic, mode: 'fm' });
  });

  it('returns the error value for a v1 link', () => {
    window.location.hash = '#s=v1.abc';
    expect(readShareFromLocation()).toMatchObject({ status: 'error', code: 'old-version' });
  });

  it('returns the old-link error for a v3 link', () => {
    window.location.hash = '#s=v3.abc';
    expect(readShareFromLocation()).toMatchObject({ status: 'error', code: 'old-version' });
  });
});

describe('clearShareHash', () => {
  it('drops the hash and keeps the path and query without adding a history entry', () => {
    window.history.replaceState(null, '', '/play?x=1#s=v2.abc');
    const length = window.history.length;
    clearShareHash();
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/play');
    expect(window.location.search).toBe('?x=1');
    expect(window.history.length).toBe(length);
  });
});
