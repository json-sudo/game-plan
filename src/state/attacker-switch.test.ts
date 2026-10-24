import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { applyAction } from './actions';
import { possessionOf } from './document';
import { createExampleDocument } from './example';

describe('setAttacker', () => {
  const before = createExampleDocument();
  const after = applyAction(before, { type: 'setAttacker', attacker: 'opponent' });
  const possessionOfRole = (roleId: string | undefined) =>
    FM26_DATA.roles.find((role) => role.id === roleId)?.possession;

  it('keeps every piece identity and slot', () => {
    expect(after.players.map(({ id, team, slot }) => [id, team, slot])).toEqual(
      before.players.map(({ id, team, slot }) => [id, team, slot]),
    );
  });

  it('gives the new attack in-possession roles and the new defence out-of-possession roles', () => {
    const roled = after.players.filter((player) => player.slot !== null && player.role);
    expect(roled.length).toBeGreaterThan(0);
    for (const player of roled) {
      expect(possessionOfRole(player.role)).toBe(possessionOf(after, player.team));
    }
    const changed = before.players.filter(
      (player, index) => player.role !== after.players[index].role,
    );
    expect(changed.length).toBeGreaterThan(0);
  });
});
