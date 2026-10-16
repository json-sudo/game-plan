import { describe, expect, it } from 'vitest';
import { playerLabel, playerSide, type Player } from './document';

function player(overrides: Partial<Player>): Player {
  return { id: 'p', team: 'mine', family: null, slot: null, isKeeper: false, ...overrides };
}

describe('playerLabel', () => {
  it('shows the family, not the site id, so a winger reads AM(L)', () => {
    expect(playerLabel(player({ slot: 'AMCL', family: 'AM(L)' }))).toBe('AM(L)');
  });

  it('falls back to the slot, then the id', () => {
    expect(playerLabel(player({ slot: 'ST' }))).toBe('ST');
    expect(playerLabel(player({ id: 'bench-1' }))).toBe('bench-1');
  });
});

describe('playerSide', () => {
  it('reads the side from the family when it has one', () => {
    expect(playerSide(player({ slot: 'AMCR', family: 'AM(R)' }))).toBe('right');
  });

  it('reads the side from the slot id when the family has none', () => {
    expect(playerSide(player({ slot: 'DCL', family: 'D(C)' }))).toBe('left');
    expect(playerSide(player({ slot: 'DMR', family: 'DM' }))).toBe('right');
  });

  it('has no side for a centre slot', () => {
    expect(playerSide(player({ slot: 'DC', family: 'D(C)' }))).toBeUndefined();
  });
});
