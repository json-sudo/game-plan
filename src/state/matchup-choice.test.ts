import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { applyAction } from './actions';
import { createInitialDocument } from './document';

const MINE = '4_3_3_dm_wide';
const OPPONENT = '4_2_3_1_dm_wide';

describe('applyMatchupChoice', () => {
  it('sets both formations and places both teams without moving the ball', () => {
    const doc = applyAction(createInitialDocument(), {
      type: 'placeBall',
      point: { x: 10, y: 10 },
    });
    const next = applyAction(doc, { type: 'applyMatchupChoice', mine: MINE, opponent: OPPONENT });
    expect(next.teams.mine).toMatchObject({ formationId: MINE, applied: 'matchup' });
    expect(next.teams.opponent).toMatchObject({ formationId: OPPONENT, applied: 'matchup' });
    expect(next.ball).toEqual({ x: 10, y: 10 });
  });

  it('does nothing when a formation id is unknown', () => {
    const doc = createInitialDocument();
    expect(applyAction(doc, { type: 'applyMatchupChoice', mine: 'nope', opponent: OPPONENT })).toBe(
      doc,
    );
    expect(FM26_DATA.formations.some((f) => f.id === MINE)).toBe(true);
  });
});
