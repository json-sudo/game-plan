import { describe, expect, it } from 'vitest';
import { FM26_DATA } from '../../data/fm26';
import type { FormationDef, Side } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import { layoutFormation } from '../layout/formations';
import { formationAnchors, slotLineOf } from './formation-anchors';
import type { FmPlayer } from './player';

const CENTRE_X = PITCH_W / 2;

function formationById(id: string): FormationDef {
  const found = FM26_DATA.formations.find((formation) => formation.id === id);
  if (!found) throw new Error(`no formation ${id}`);
  return found;
}

function squad(formation: FormationDef, team: Side, goalkeeperRole?: string): FmPlayer[] {
  const layout = layoutFormation(formation, team);
  return formation.slots.map((slot) => ({
    id: `${team}:${slot.id}`,
    team,
    family: slot.family,
    base: layout.get(slot.id)!,
    roleId: slot.family === 'GK' ? goalkeeperRole : undefined,
    isKeeper: slot.family === 'GK',
  }));
}

function anchorsOf(
  formation: FormationDef,
  zone: ZoneId,
  options: { opponent?: FormationDef; goalkeeperRole?: string } = {},
) {
  const players = [
    ...squad(formation, 'mine', options.goalkeeperRole),
    ...(options.opponent ? squad(options.opponent, 'opponent') : []),
  ];
  return formationAnchors({ attacker: 'mine', players, zone });
}

describe('slotLineOf', () => {
  it('separates wide attackers from half-space attacking midfielders by position', () => {
    expect(slotLineOf('AM(L)', 15.238)).toBe('WA');
    expect(slotLineOf('AM(R)', 60.952)).toBe('WA');
    expect(slotLineOf('AM(L)', 19.0475)).toBe('AM');
    expect(slotLineOf('AM(R)', 57.1425)).toBe('AM');
    expect(slotLineOf('AM(C)', 38.095)).toBe('AM');
  });

  it('maps the other families to their slot line', () => {
    expect(slotLineOf('GK', CENTRE_X)).toBe('GK');
    expect(slotLineOf('D(C)', 20)).toBe('CB');
    expect(slotLineOf('D(L)', 11)).toBe('FB');
    expect(slotLineOf('WB(R)', 64)).toBe('WB');
    expect(slotLineOf('DM', 30)).toBe('DM');
    expect(slotLineOf('M(C)', 30)).toBe('CM');
    expect(slotLineOf('ST', 30)).toBe('ST');
  });
});

describe('formationAnchors depth', () => {
  const formation = formationById('3_4_3_dm_wide');

  it('uses the attacking depth column of the ball third', () => {
    const final = anchorsOf(formation, 'C-F');
    const middle = anchorsOf(formation, 'C-M');
    const defensive = anchorsOf(formation, 'C-D');
    expect(final.get('mine:DC')!.point.y).toBe(49);
    expect(middle.get('mine:DC')!.point.y).toBe(66);
    expect(defensive.get('mine:DC')!.point.y).toBe(84);
    expect(middle.get('mine:WBL')!.point.y).toBe(49);
    expect(middle.get('mine:DMCL')!.point.y).toBe(59);
    expect(middle.get('mine:ST')!.point.y).toBe(30);
    expect(middle.get('mine:AMCL')!.point.y).toBe(36);
  });

  it('uses the defending depth column for the opposing team', () => {
    const anchors = anchorsOf(formation, 'C-M', { opponent: formation });
    expect(anchors.get('opponent:DC')!.point.y).toBe(24);
    expect(anchors.get('opponent:WBL')!.point.y).toBe(28);
    expect(anchors.get('opponent:ST')!.point.y).toBe(58);
    expect(anchors.get('opponent:GK')!.point.y).toBe(4);
  });
});

describe('formationAnchors lateral', () => {
  it('preserves rank inside each central family with the contract pairs and triples', () => {
    const anchors = anchorsOf(formationById('3_4_3_dm_wide'), 'C-M');
    expect(anchors.get('mine:DCL')!.point.x).toBe(20);
    expect(anchors.get('mine:DC')!.point.x).toBeCloseTo(CENTRE_X, 9);
    expect(anchors.get('mine:DCR')!.point.x).toBeCloseTo(56.19, 9);
    expect(anchors.get('mine:DMCL')!.point.x).toBe(27);
    expect(anchors.get('mine:DMCR')!.point.x).toBeCloseTo(49.19, 9);
    expect(anchors.get('mine:ST')!.point.x).toBeCloseTo(CENTRE_X, 9);
  });

  it('keeps a narrow formation narrow instead of filling the wing slots', () => {
    const anchors = anchorsOf(formationById('4_2_2_2_am_narrow'), 'C-M');
    expect(anchors.get('mine:AMCL')!.point.x).toBe(25);
    expect(anchors.get('mine:AMCR')!.point.x).toBeCloseTo(51.19, 9);
    expect(anchors.get('mine:AMCL')!.line).toBe('AM');
    const spread = anchorsOf(formationById('4_2_3_1_dm_wide'), 'C-M');
    expect(spread.get('mine:AML')!.point.x).toBe(10);
    expect(spread.get('mine:AMR')!.point.x).toBeCloseTo(PITCH_W - 10, 9);
    expect(spread.get('mine:AMC')!.point.x).toBeCloseTo(CENTRE_X, 9);
  });

  it('uses the final-third and defending wide columns', () => {
    const formation = formationById('4_2_3_1_dm_wide');
    expect(anchorsOf(formation, 'C-F').get('mine:AML')!.point.x).toBe(14);
    expect(anchorsOf(formation, 'C-F').get('mine:DL')!.point.x).toBe(10);
    const defending = anchorsOf(formation, 'C-M', { opponent: formation });
    expect(defending.get('opponent:DL')!.point.x).toBeCloseTo(PITCH_W - 16, 9);
    expect(
      anchorsOf(formation, 'C-F', { opponent: formation }).get('opponent:AML')!.point.x,
    ).toBeCloseTo(PITCH_W - 17, 9);
    const wingBacks = formationById('3_4_3_dm_wide');
    expect(
      anchorsOf(wingBacks, 'C-M', { opponent: wingBacks }).get('opponent:WBL')!.point.x,
    ).toBeCloseTo(PITCH_W - 12, 9);
  });
});

describe('formationAnchors lane shift', () => {
  const formation = formationById('4_3_3_dm_wide');

  it('shifts the intact attack by 0, 1.5 and 3 and keeps relative spacing', () => {
    const centre = anchorsOf(formation, 'C-M');
    const half = anchorsOf(formation, 'RH-M');
    const flank = anchorsOf(formation, 'R-M');
    const left = anchorsOf(formation, 'L-M');
    for (const [id, anchor] of centre) {
      if (id === 'mine:GK') continue;
      expect(half.get(id)!.point.x - anchor.point.x).toBeCloseTo(1.5, 9);
      expect(flank.get(id)!.point.x - anchor.point.x).toBeCloseTo(3, 9);
      expect(left.get(id)!.point.x - anchor.point.x).toBeCloseTo(-3, 9);
      expect(flank.get(id)!.point.y).toBe(anchor.point.y);
    }
  });

  it('shifts the defence by 0, 3 and 5', () => {
    const centre = anchorsOf(formation, 'C-M', { opponent: formation });
    const half = anchorsOf(formation, 'LH-M', { opponent: formation });
    const flank = anchorsOf(formation, 'R-M', { opponent: formation });
    for (const [id, anchor] of centre) {
      if (!id.startsWith('opponent:') || id === 'opponent:GK') continue;
      expect(half.get(id)!.point.x - anchor.point.x).toBeCloseTo(-3, 9);
      expect(flank.get(id)!.point.x - anchor.point.x).toBeCloseTo(5, 9);
    }
  });

  it('gives the goalkeepers 20% of the shift', () => {
    const flank = anchorsOf(formation, 'R-M', { opponent: formation });
    expect(flank.get('mine:GK')!.point.x).toBeCloseTo(CENTRE_X + 0.6, 9);
    expect(flank.get('opponent:GK')!.point.x).toBeCloseTo(CENTRE_X + 1, 9);
  });
});

describe('formationAnchors goalkeepers', () => {
  const formation = formationById('4_3_3_dm_wide');

  it('places the attacking keeper by role', () => {
    expect(anchorsOf(formation, 'C-M').get('mine:GK')!.point.y).toBe(96);
    expect(
      anchorsOf(formation, 'C-M', { goalkeeperRole: 'no_nonsense_goalkeeper_ip' }).get('mine:GK')!
        .point.y,
    ).toBe(96);
    expect(
      anchorsOf(formation, 'C-M', { goalkeeperRole: 'ball_playing_goalkeeper_ip' }).get('mine:GK')!
        .point.y,
    ).toBe(92);
  });
});
