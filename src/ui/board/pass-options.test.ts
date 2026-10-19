import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import { applyAction } from '../../state/actions';
import { createExampleDocument, EXAMPLE_CARRIER } from '../../state/example';
import { passOptionsOf } from './pass-options';

function exampleSlotId(team: string, slot: string): string {
  const found = createExampleDocument().players.find((p) => p.team === team && p.slot === slot);
  if (!found) throw new Error(`no example ${team} player at ${slot}`);
  return found.id;
}

describe('passOptionsOf', () => {
  it('lists every placed teammate of the carrier except the carrier, with roles', () => {
    const options = passOptionsOf(createExampleDocument(), FM26_DATA);
    expect(options).toHaveLength(10);
    expect(options.some((option) => option.id === EXAMPLE_CARRIER)).toBe(false);
    expect(options.every((option) => option.id.startsWith('mine-'))).toBe(true);
    expect(options.find((option) => option.id === exampleSlotId('mine', 'ST'))).toMatchObject({
      label: 'ST',
      role: expect.any(String),
    });
  });

  it('is empty until somebody has the ball', () => {
    const doc = applyAction(createExampleDocument(), { type: 'clearScenario' });
    expect(passOptionsOf(doc, FM26_DATA)).toEqual([]);
  });

  it('skips benched teammates', () => {
    const doc = applyAction(createExampleDocument(), {
      type: 'benchPlayer',
      playerId: exampleSlotId('mine', 'ST'),
    });
    expect(
      passOptionsOf(doc, FM26_DATA).some((option) => option.id === exampleSlotId('mine', 'ST')),
    ).toBe(false);
  });
});
