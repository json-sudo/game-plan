import { describe, expect, it } from 'vitest';
import { tokenKeyCommand } from './token-keys';

const base = { x: 30, y: 60 };

describe('tokenKeyCommand', () => {
  it('nudges a placed piece one unit per arrow, five with shift, in either mode', () => {
    for (const mode of ['openPitch', 'fm'] as const) {
      expect(tokenKeyCommand({ key: 'ArrowRight', shift: false, base, mode })).toEqual({
        kind: 'move',
        point: { x: 31, y: 60 },
      });
      expect(tokenKeyCommand({ key: 'ArrowUp', shift: true, base, mode })).toEqual({
        kind: 'move',
        point: { x: 30, y: 55 },
      });
    }
  });

  it('opens the piece for choosing a role with Enter or Space in FM mode only', () => {
    expect(tokenKeyCommand({ key: 'Enter', shift: false, base, mode: 'fm' })).toEqual({
      kind: 'select',
    });
    expect(tokenKeyCommand({ key: ' ', shift: false, base, mode: 'fm' })).toEqual({
      kind: 'select',
    });
    expect(tokenKeyCommand({ key: 'Enter', shift: false, base, mode: 'openPitch' })).toBeNull();
  });

  it('returns a placed piece to the bench with Delete or Backspace in Open pitch only', () => {
    expect(tokenKeyCommand({ key: 'Delete', shift: false, base, mode: 'openPitch' })).toEqual({
      kind: 'bench',
    });
    expect(tokenKeyCommand({ key: 'Backspace', shift: false, base, mode: 'openPitch' })).toEqual({
      kind: 'bench',
    });
    expect(tokenKeyCommand({ key: 'Delete', shift: false, base, mode: 'fm' })).toBeNull();
  });

  it('does not move a piece that has no place on the pitch', () => {
    expect(
      tokenKeyCommand({ key: 'ArrowLeft', shift: false, base: undefined, mode: 'openPitch' }),
    ).toBeNull();
  });

  it('ignores every other key', () => {
    expect(tokenKeyCommand({ key: 'a', shift: false, base, mode: 'fm' })).toBeNull();
  });
});
