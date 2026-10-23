import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../data/fm26';
import { ZONE_IDS } from '../data/zones';
import { applyAction, type Action } from './actions';
import { createInitialDocument, type PitchDocument } from './document';
import { eligibleCarrierIdsOf, visualizationStartersOf } from './eligible-carriers';
import { createExampleDocument } from './example';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

function run(doc: PitchDocument, ...actions: Action[]): PitchDocument {
  return actions.reduce((current, action) => applyAction(current, action), doc);
}

function matchup(): PitchDocument {
  return run(
    createInitialDocument(),
    { type: 'applyFormation', team: 'mine', formationId: '4_3_3_dm_wide' },
    { type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' },
    { type: 'applyMatchup' },
    { type: 'fillDefaultRoles' },
  );
}

describe('eligibleCarrierIdsOf', () => {
  it('lists the attacking team players whose default role fits the zone', () => {
    const ids = eligibleCarrierIdsOf(matchup(), 'R-F', FM26_DATA);
    expect(ids).toEqual([exampleSlotId('mine', 'DR'), exampleSlotId('mine', 'AMCR')]);
  });

  it('mirrors the side-specific players for the left lane', () => {
    const ids = eligibleCarrierIdsOf(matchup(), 'L-F', FM26_DATA);
    expect(ids).toEqual([exampleSlotId('mine', 'DL'), exampleSlotId('mine', 'AMCL')]);
  });

  it('follows the attacking team, mirrored by its own formation', () => {
    const doc = run(matchup(), { type: 'setAttacker', attacker: 'opponent' });
    const ids = eligibleCarrierIdsOf(doc, 'C-F', FM26_DATA);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith('opponent-'))).toBe(true);
  });

  it('does not use player coordinates to filter', () => {
    const doc = matchup();
    const moved = run(doc, {
      type: 'movePlayer',
      playerId: exampleSlotId('mine', 'AMCR'),
      point: { x: 5, y: 95 },
    });
    expect(eligibleCarrierIdsOf(moved, 'R-F', FM26_DATA)).toEqual(
      eligibleCarrierIdsOf(doc, 'R-F', FM26_DATA),
    );
  });

  it('skips benched players and players without a role', () => {
    const benched = run(matchup(), {
      type: 'benchPlayer',
      playerId: exampleSlotId('mine', 'AMCR'),
    });
    expect(eligibleCarrierIdsOf(benched, 'R-F', FM26_DATA)).toEqual([exampleSlotId('mine', 'DR')]);
    const roleless = run(matchup(), {
      type: 'setRole',
      playerId: exampleSlotId('mine', 'DR'),
      roleId: null,
    });
    expect(eligibleCarrierIdsOf(roleless, 'R-F', FM26_DATA)).toEqual([
      exampleSlotId('mine', 'AMCR'),
    ]);
  });

  it('offers a Wide Centre-Back on the outermost centre-back slot of a three-back formation', () => {
    const threeBack = run(
      createInitialDocument(),
      { type: 'applyFormation', team: 'mine', formationId: '3_4_3_dm_wide' },
      { type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' },
      { type: 'applyMatchup' },
      { type: 'fillDefaultRoles' },
    );
    const outer = threeBack.players.find((p) => p.team === 'mine' && p.slot === 'DCL')!.id;
    const doc = run(threeBack, { type: 'setRole', playerId: outer, roleId: 'wide_centre_back_ip' });
    expect(eligibleCarrierIdsOf(doc, 'L-D', FM26_DATA)).toContain(outer);
    expect(eligibleCarrierIdsOf(doc, 'LH-D', FM26_DATA)).toContain(outer);
    expect(eligibleCarrierIdsOf(doc, 'C-D', FM26_DATA)).not.toContain(outer);
  });

  it('is empty before the attacking team has a formation', () => {
    expect(eligibleCarrierIdsOf(createInitialDocument(), 'C-F', FM26_DATA)).toEqual([]);
  });
});

describe('visualizationStartersOf', () => {
  it('lists the 4-3-3 DM Wide right-flank final-third starters with the AM(R) winger', () => {
    const doc = matchup();
    const ids = visualizationStartersOf(doc, 'R-F', FM26_DATA);
    const winger = doc.players.find((p) => p.team === 'mine' && p.slot === 'AMCR')!;
    expect(winger.role).toBe('winger_ip');
    expect(ids).toEqual([exampleSlotId('mine', 'DR'), winger.id]);
  });

  it('keeps the AM(L) on the left flank and never offers the AM(R) there', () => {
    const ids = visualizationStartersOf(matchup(), 'L-F', FM26_DATA);
    expect(ids).toContain(exampleSlotId('mine', 'AMCL'));
    expect(ids).not.toContain(exampleSlotId('mine', 'AMCR'));
  });

  it.each(
    FM26_DATA.formations.flatMap((formation) =>
      ZONE_IDS.map((zone) => ({ formationId: formation.id, zone })),
    ),
  )('has a starter in $zone for $formationId at default roles', ({ formationId, zone }) => {
    const doc = run(
      createInitialDocument(),
      { type: 'applyFormation', team: 'mine', formationId },
      { type: 'applyFormation', team: 'opponent', formationId: '4_2_3_1_dm_wide' },
      { type: 'applyMatchup' },
      { type: 'fillDefaultRoles' },
    );
    expect(visualizationStartersOf(doc, zone, FM26_DATA).length).toBeGreaterThan(0);
  });
});
