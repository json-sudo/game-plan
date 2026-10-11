import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '../../data/fm26';
import type { FormationDef, Side } from '../../data/types';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import {
  MATCHUP_FRONT_MARGIN,
  MATCHUP_MAX_ADVANCE,
  layoutFormation,
  layoutMatchup,
  mirrorPoint,
} from './formations';
import { MIN_SEP } from './separation';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const formation = (id: string): FormationDef => FORMATIONS.find((f) => f.id === id)!;

describe('mirrorPoint', () => {
  it('rotates 180 degrees about the pitch centre and is its own inverse', () => {
    const point = { x: 10, y: 20 };
    const mirrored = mirrorPoint(point);
    expect(mirrored.x).toBeCloseTo(PITCH_W - 10);
    expect(mirrored.y).toBeCloseTo(PITCH_H - 20);
    const back = mirrorPoint(mirrored);
    expect(back.x).toBeCloseTo(10);
    expect(back.y).toBeCloseTo(20);
  });
});

describe('layoutFormation', () => {
  it('places my team on the base coordinates, goal at the bottom', () => {
    const layout = layoutFormation(formation('4_3_3_dm_wide'), 'mine');
    expect(layout.size).toBe(11);
    expect(layout.get('GK')).toEqual({ x: 38.095, y: 90 });
    expect(layout.get('ST')).toEqual({ x: 38.095, y: 20 });
  });

  it('rotates the same data for the opponent', () => {
    const layout = layoutFormation(formation('4_3_3_dm_wide'), 'opponent');
    expect(layout.get('GK')?.x).toBeCloseTo(38.095);
    expect(layout.get('GK')?.y).toBeCloseTo(10);
    expect(layout.get('ST')?.y).toBeCloseTo(80);
    expect(layout.get('DL')?.x).toBeCloseTo(PITCH_W - 11.4285);
  });

  it('places all 12 formations with a point for every slot', () => {
    for (const def of FORMATIONS) {
      for (const team of ['mine', 'opponent'] as const) {
        const layout = layoutFormation(def, team);
        expect([...layout.keys()]).toEqual(def.slots.map((slot) => slot.id));
      }
    }
  });

  it('does not mutate the formation data', () => {
    const def = formation('4_3_3_dm_wide');
    const copy = structuredClone(def);
    layoutFormation(def, 'opponent');
    expect(def).toEqual(copy);
  });
});

describe('layoutMatchup', () => {
  const def = formation('4_3_3_dm_wide');

  it('leaves the defender on the standard layout', () => {
    const result = layoutMatchup('mine', { mine: def, opponent: def });
    const standard = layoutFormation(def, 'opponent');
    for (const [slot, point] of standard) expect(result.opponent.get(slot)).toEqual(point);
  });

  it('keeps the attacking keeper and advances the outfield towards the opponent goal', () => {
    const result = layoutMatchup('mine', { mine: def, opponent: def });
    const standard = layoutFormation(def, 'mine');
    expect(result.mine.get('GK')).toEqual(standard.get('GK'));
    expect(result.mine.get('ST')!.y).toBeLessThan(standard.get('ST')!.y);
  });

  it('advances the front attacker by at most the maximum advance', () => {
    const result = layoutMatchup('mine', { mine: def, opponent: def });
    const standard = layoutFormation(def, 'mine');
    expect(standard.get('ST')!.y - result.mine.get('ST')!.y).toBeLessThanOrEqual(
      MATCHUP_MAX_ADVANCE + MIN_SEP,
    );
  });

  it('keeps every attacker on the pitch after separation', () => {
    const result = layoutMatchup('mine', { mine: def, opponent: def });
    for (const point of result.mine.values()) {
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(PITCH_H);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(PITCH_W);
    }
  });

  it('stops the front attacker at the front margin when the formation is already high', () => {
    const high: FormationDef = {
      id: 'high',
      name: 'High',
      slots: [
        { id: 'GK', family: 'GK', base: { x: 38, y: 90 } },
        { id: 'ST', family: 'ST', base: { x: 5, y: MATCHUP_FRONT_MARGIN + 4 } },
      ],
    };
    const far: FormationDef = {
      ...high,
      slots: [{ id: 'GK', family: 'GK', base: { x: 20, y: 90 } }],
    };
    const result = layoutMatchup('mine', { mine: high, opponent: far });
    expect(result.mine.get('ST')!.y).toBeCloseTo(MATCHUP_FRONT_MARGIN);
  });

  it('mirrors the advance when the opponent attacks', () => {
    const result = layoutMatchup('opponent', { mine: def, opponent: def });
    const standard = layoutFormation(def, 'opponent');
    expect(result.opponent.get('GK')).toEqual(standard.get('GK'));
    expect(result.opponent.get('ST')!.y).toBeGreaterThan(standard.get('ST')!.y);
    const mineStandard = layoutFormation(def, 'mine');
    expect(result.mine.get('ST')).toEqual(mineStandard.get('ST'));
  });

  it('leaves no attacker closer than the minimum separation to a defender', () => {
    const offenders: string[] = [];
    for (const attackerFormation of FORMATIONS) {
      for (const defenderFormation of FORMATIONS) {
        for (const attacker of ['mine', 'opponent'] as const) {
          const defender: Side = attacker === 'mine' ? 'opponent' : 'mine';
          const result = layoutMatchup(attacker, {
            [attacker]: attackerFormation,
            [defender]: defenderFormation,
          } as Record<Side, FormationDef>);
          const attackers = attackerFormation.slots.filter((s) => s.family !== 'GK');
          for (const slot of attackers) {
            const point = result[attacker].get(slot.id)!;
            for (const other of result[defender].values()) {
              if (distance(point, other) < MIN_SEP - 0.01) {
                offenders.push(
                  `${attacker} ${attackerFormation.id} v ${defenderFormation.id} ${slot.id}`,
                );
              }
            }
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('is deterministic', () => {
    const a = layoutMatchup('mine', { mine: def, opponent: formation('3_2_4_1') });
    const b = layoutMatchup('mine', { mine: def, opponent: formation('3_2_4_1') });
    expect(a).toEqual(b);
  });
});
