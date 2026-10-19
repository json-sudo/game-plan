import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import { applyAction } from '../../state/actions';
import { createExampleDocument } from '../../state/example';
import { carrierOptionsOf } from './carrier-options';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

describe('carrierOptionsOf', () => {
  it('lists the eligible attackers of the ball zone with their position and role', () => {
    const doc = createExampleDocument();
    expect(carrierOptionsOf(doc, FM26_DATA)).toEqual([
      { id: exampleSlotId('mine', 'DR'), label: 'D(R)', role: 'Wing Back' },
      { id: exampleSlotId('mine', 'AMCR'), label: 'AM(R)', role: 'Winger' },
    ]);
  });

  it('follows the ball zone, not the stored scenario', () => {
    const doc = applyAction(createExampleDocument(), { type: 'tapZone', zone: 'C-F' });
    expect(carrierOptionsOf(doc, FM26_DATA).map((option) => option.id)).toEqual([
      exampleSlotId('mine', 'ST'),
    ]);
  });

  it('keeps a pass carrier outside the zone matrix as the selected option', () => {
    const doc = applyAction(createExampleDocument(), {
      type: 'pass',
      receiverId: exampleSlotId('mine', 'GK'),
    });
    expect(doc.scenario?.carrierId).toBe(exampleSlotId('mine', 'GK'));
    expect(carrierOptionsOf(doc, FM26_DATA)[0]?.id).toBe(exampleSlotId('mine', 'GK'));
  });

  it('is empty without a formation for the attacking team', () => {
    const blank = applyAction(createExampleDocument(), { type: 'reset' });
    const cleared = {
      ...blank,
      teams: { ...blank.teams, mine: { ...blank.teams.mine, formationId: null } },
    };
    expect(carrierOptionsOf(cleared, FM26_DATA)).toEqual([]);
  });
});
