import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import { computePhases, type PhaseInput } from './phases';
import { PROVISIONAL_POSITION_ENGINE } from './position-engine';

const input: PhaseInput = {
  attacker: 'mine',
  players: [
    { id: 'a', team: 'mine', base: { x: 38, y: 70 }, isKeeper: false },
    { id: 'b', team: 'opponent', base: { x: 38, y: 30 }, isKeeper: false },
  ],
  ball: { x: 38, y: 60 },
  carrierId: 'a',
  tables: {
    movement: FM26_DATA.movement,
    shapeLineShift: FM26_DATA.shapeLineShift,
    lineShift: FM26_DATA.lineShift,
  },
};

describe('PROVISIONAL_POSITION_ENGINE', () => {
  it('is the foundation engine until the role by zone destination table is approved', () => {
    expect(PROVISIONAL_POSITION_ENGINE).toBe(computePhases);
  });

  it('turns a phase input into positions for every phase', () => {
    const result = PROVISIONAL_POSITION_ENGINE(input);
    for (const phase of ['shape', 'runs', 'final'] as const) {
      expect(result.positions[phase].has('a')).toBe(true);
    }
  });
});
