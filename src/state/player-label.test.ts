import { describe, expect, it } from 'vitest';
import { playerSide, type Player } from './document';

function player(overrides: Partial<Player>): Player {
  return { id: 'p', team: 'mine', family: null, slot: null, isKeeper: false, ...overrides };
}

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
