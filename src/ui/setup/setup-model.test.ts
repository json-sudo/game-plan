import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from '../../state/actions';
import {
  createInitialDocument,
  isSetupComplete,
  type PitchDocument,
  type Player,
} from '../../state/document';
import { roleOptions, setupCursor, setupStepNumbers } from './setup-model';

const WIDE_CENTRE_BACK = 'wide_centre_back_ip';

function matchup(formationId: string): PitchDocument {
  const actions: Action[] = [
    { type: 'applyFormation', team: 'mine', formationId },
    { type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' },
    { type: 'applyMatchup' },
  ];
  return actions.reduce((doc, action) => applyAction(doc, action), createInitialDocument());
}

function optionIds(doc: PitchDocument, slot: string): string[] {
  const player = doc.players.find(
    (candidate) => candidate.team === 'mine' && candidate.slot === slot,
  ) as Player;
  return roleOptions(doc, player).map((role) => role.id);
}

describe('roleOptions', () => {
  it('offers Wide Centre-Back only to the outermost centre-backs of a three-back formation', () => {
    const threeBack = matchup('3_4_3_dm_wide');
    expect(optionIds(threeBack, 'DCL')).toContain(WIDE_CENTRE_BACK);
    expect(optionIds(threeBack, 'DCR')).toContain(WIDE_CENTRE_BACK);
    expect(optionIds(threeBack, 'DC')).not.toContain(WIDE_CENTRE_BACK);
    expect(optionIds(threeBack, 'DC')).toContain('centre_back_ip');
  });

  it('does not offer Wide Centre-Back in a two-centre-back formation', () => {
    const fourBack = matchup('4_3_3_dm_wide');
    expect(optionIds(fourBack, 'DCL')).not.toContain(WIDE_CENTRE_BACK);
    expect(optionIds(fourBack, 'DCL')).toContain('centre_back_ip');
  });
});

describe('setup without an opponent', () => {
  const mineOnly = () => {
    const actions: Action[] = [
      { type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' },
      { type: 'fillDefaultRoles' },
    ];
    return actions.reduce((doc, action) => applyAction(doc, action), createInitialDocument());
  };

  it('is complete with my formation and roles only', () => {
    expect(isSetupComplete(mineOnly())).toBe(true);
    expect(isSetupComplete(createInitialDocument())).toBe(false);
  });

  it('is incomplete when my formation is missing even with roles set', () => {
    const doc = mineOnly();
    const withoutFormation: PitchDocument = {
      ...doc,
      teams: { ...doc.teams, mine: { ...doc.teams.mine, formationId: null } },
    };
    expect(isSetupComplete(withoutFormation)).toBe(false);
  });

  it('has 2 steps without an opponent formation and 3 with one', () => {
    expect(setupStepNumbers(mineOnly())).toHaveLength(2);
    expect(setupStepNumbers(matchup('4_3_3_dm_wide'))).toHaveLength(3);
  });

  it('ignores a stored Who attacks step once the opponent is gone', () => {
    expect(setupCursor(mineOnly(), 2)).toBeNull();
    expect(setupCursor(createInitialDocument(), 2)).toBe(1);
    expect(setupCursor(matchup('4_3_3_dm_wide'), 2)).toBe(2);
  });

  it('keeps who attacks on mine', () => {
    const doc = applyAction(mineOnly(), { type: 'setAttacker', attacker: 'opponent' });
    expect(doc.attacker).toBe('mine');
  });
});
