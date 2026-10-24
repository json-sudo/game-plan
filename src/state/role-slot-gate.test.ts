import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { applyAction, type Action } from './actions';
import { createInitialDocument, isRoleValidFor, type PitchDocument } from './document';

const OCB = 'overlapping_centre_back_ip';
const WCB = 'wide_centre_back_ip';

function matchup(formationId: string): PitchDocument {
  const actions: Action[] = [
    { type: 'applyFormation', team: 'mine', formationId },
    { type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' },
    { type: 'applyMatchup' },
  ];
  return actions.reduce((doc, action) => applyAction(doc, action), createInitialDocument());
}

function validRoleIds(doc: PitchDocument, slot: string): string[] {
  const player = doc.players.find((p) => p.team === 'mine' && p.slot === slot)!;
  return FM26_DATA.roles
    .filter((role) => isRoleValidFor(doc, FM26_DATA, player, role.id))
    .map((role) => role.id);
}

function expectedRoleIds(doc: PitchDocument, slot: string, outermostCentreBack: boolean) {
  const player = doc.players.find((p) => p.team === 'mine' && p.slot === slot)!;
  return FM26_DATA.roles
    .filter(
      (role) =>
        role.possession === 'in' &&
        role.families.includes(player.family!) &&
        ([OCB, WCB].includes(role.id) ? outermostCentreBack : true),
    )
    .map((role) => role.id);
}

describe('role validity per slot', () => {
  const threeBack = matchup('3_4_3_dm_wide');
  const fourBack = matchup('4_3_3_dm_wide');

  it('accepts OCB only in the outer centre-back slots of a three-back formation', () => {
    expect(validRoleIds(threeBack, 'DCL')).toContain(OCB);
    expect(validRoleIds(threeBack, 'DCR')).toContain(OCB);
    expect(validRoleIds(threeBack, 'DC')).not.toContain(OCB);
  });

  it('rejects OCB in a four-back formation and outside centre-back slots', () => {
    expect(validRoleIds(fourBack, 'DCL')).not.toContain(OCB);
    expect(validRoleIds(fourBack, 'DCR')).not.toContain(OCB);
    expect(validRoleIds(threeBack, 'GK')).not.toContain(OCB);
    expect(validRoleIds(threeBack, 'WBL')).not.toContain(OCB);
    expect(validRoleIds(threeBack, 'ST')).not.toContain(OCB);
  });

  it('accepts each existing role only where its family and possession match', () => {
    const cases: Array<[PitchDocument, string, boolean]> = [
      [threeBack, 'GK', false],
      [threeBack, 'DCL', true],
      [threeBack, 'DC', false],
      [threeBack, 'DCR', true],
      [threeBack, 'WBL', false],
      [threeBack, 'ST', false],
      [fourBack, 'DL', false],
      [fourBack, 'DCL', false],
      [fourBack, 'DCR', false],
    ];
    for (const [doc, slot, outermost] of cases) {
      expect(validRoleIds(doc, slot)).toEqual(expectedRoleIds(doc, slot, outermost));
    }
  });

  it('rejects existing roles in slots whose family they do not list', () => {
    expect(validRoleIds(threeBack, 'GK')).not.toContain('centre_back_ip');
    expect(validRoleIds(threeBack, 'DC')).not.toContain('goalkeeper_ip');
    expect(validRoleIds(threeBack, 'DC')).not.toContain('winger_ip');
    expect(validRoleIds(threeBack, 'DC')).toContain('centre_back_ip');
    expect(validRoleIds(threeBack, 'GK')).toContain('goalkeeper_ip');
  });
});
