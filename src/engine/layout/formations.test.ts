import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '../../data/fm26';
import type { FormationDef } from '../../data/types';
import { PITCH_H, PITCH_W } from '../geometry/pitch';
import { layoutFormation, mirrorPoint } from './formations';

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
