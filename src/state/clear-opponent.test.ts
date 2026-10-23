import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from './actions';
import { createInitialDocument, placedPlayers } from './document';

const actions: Action[] = [
  { type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' },
  { type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' },
  { type: 'applyMatchup' },
  { type: 'setAttacker', attacker: 'opponent' },
];

describe('clearOpponent', () => {
  const withOpponent = actions.reduce(
    (doc, action) => applyAction(doc, action),
    createInitialDocument(),
  );

  it('removes the opponent formation and pieces and gives the attack back to my team', () => {
    const doc = applyAction(withOpponent, { type: 'clearOpponent' });
    expect(doc.teams.opponent.formationId).toBeNull();
    expect(doc.attacker).toBe('mine');
    expect(placedPlayers(doc).every((player) => player.team === 'mine')).toBe(true);
  });

  it('is a no-op without an opponent', () => {
    const doc = createInitialDocument();
    expect(applyAction(doc, { type: 'clearOpponent' })).toBe(doc);
  });
});
