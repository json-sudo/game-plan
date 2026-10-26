import { describe, expect, it } from 'vitest';
import type { Family, FormationSlot, SlotId } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import type { CarrierPlayer, LateralSide } from './carrier-eligibility';
import { visualizationStarters } from './visualization';

const SLOTS: readonly FormationSlot[] = [
  { id: 'MCL', family: 'M(C)', base: { x: 24, y: 50 } },
  { id: 'MCR', family: 'M(C)', base: { x: 52, y: 50 } },
  { id: 'AML', family: 'AM(L)', base: { x: 10, y: 30 } },
  { id: 'AMR', family: 'AM(R)', base: { x: 66, y: 30 } },
];

const MIRRORED_ZONES: readonly [ZoneId, ZoneId][] = [
  ['LH-M', 'RH-M'],
  ['LH-F', 'RH-F'],
];

function player(
  id: string,
  roleId: string,
  family: Family,
  slot: SlotId,
  side?: LateralSide,
): CarrierPlayer {
  return { id, roleId, family, slot, side };
}

const CM_LEFT = player('mine:MCL', 'central_midfielder_ip', 'M(C)', 'MCL', 'left');
const CM_RIGHT = player('mine:MCR', 'central_midfielder_ip', 'M(C)', 'MCR', 'right');
const WINGER_LEFT = player('mine:AML', 'inside_forward_ip', 'AM(L)', 'AML', 'left');
const WINGER_RIGHT = player('mine:AMR', 'inside_forward_ip', 'AM(R)', 'AMR', 'right');
const SQUAD = [WINGER_LEFT, WINGER_RIGHT, CM_LEFT, CM_RIGHT];

function startersIn(zone: ZoneId, players: readonly CarrierPlayer[] = SQUAD) {
  return visualizationStarters(zone, players, SLOTS);
}

describe('starter order', () => {
  it('makes an ordinary Central Midfielder eligible on both sides', () => {
    for (const zone of ['LH-M', 'RH-M', 'LH-F', 'RH-F'] as const) {
      expect(startersIn(zone)).toEqual(expect.arrayContaining(['mine:MCL', 'mine:MCR']));
    }
  });

  it('orders the near-side midfielder first, then the far side, then wide attackers', () => {
    expect(startersIn('LH-M')).toEqual(['mine:MCL', 'mine:MCR', 'mine:AML']);
    expect(startersIn('RH-M')).toEqual(['mine:MCR', 'mine:MCL', 'mine:AMR']);
  });

  it('mirrors the order spatially in every middle and final half-space pair', () => {
    for (const [left, right] of MIRRORED_ZONES) {
      const swapSide = (id: string) => id.replace(/L$/, '#').replace(/R$/, 'L').replace(/#$/, 'R');
      expect(startersIn(right)).toEqual(startersIn(left).map(swapSide));
    }
  });

  it('puts a central midfielder between the near and far sides', () => {
    const single = player('mine:AMC', 'central_midfielder_ip', 'M(C)', 'AMC');
    const slots: readonly FormationSlot[] = [
      ...SLOTS,
      { id: 'AMC', family: 'M(C)', base: { x: 38, y: 50 } },
    ];
    expect(visualizationStarters('LH-M', [CM_RIGHT, single, CM_LEFT], slots)).toEqual([
      'mine:MCL',
      'mine:AMC',
      'mine:MCR',
    ]);
  });

  it('puts Channel Midfielders in the same tier as ordinary midfielders', () => {
    const channel = player('mine:MCR', 'channel_midfielder_ip', 'M(C)', 'MCR', 'right');
    expect(startersIn('LH-F', [WINGER_LEFT, channel, CM_LEFT])).toEqual([
      'mine:MCL',
      'mine:MCR',
      'mine:AML',
    ]);
  });

  it('breaks side ties by lateral slot order and then stable id', () => {
    const slots: readonly FormationSlot[] = [
      { id: 'DMCR', family: 'M(C)', base: { x: 30, y: 50 } },
      { id: 'DMCL', family: 'M(C)', base: { x: 22, y: 50 } },
    ];
    const inner = player('mine:B', 'central_midfielder_ip', 'M(C)', 'DMCL', 'left');
    const outer = player('mine:A', 'central_midfielder_ip', 'M(C)', 'DMCR', 'left');
    expect(visualizationStarters('LH-M', [outer, inner], slots)).toEqual(['mine:B', 'mine:A']);
    expect(visualizationStarters('RH-M', [outer, inner], slots)).toEqual(['mine:A', 'mine:B']);
    const twin = { ...inner, id: 'mine:Z', slot: 'DMCL' as SlotId };
    expect(visualizationStarters('LH-M', [twin, inner], slots)).toEqual(['mine:B', 'mine:Z']);
  });

  it('keeps retained eligible variants and leaves other zones in formation order', () => {
    expect(startersIn('LH-M')).toContain('mine:AML');
    expect(startersIn('LH-D')).toEqual([]);
    expect(startersIn('L-M')).toEqual(['mine:AML']);
  });
});
