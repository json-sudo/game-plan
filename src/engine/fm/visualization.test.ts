import { describe, expect, it } from 'vitest';
import type { Family, FormationSlot, SlotId } from '../../data/types';
import type { ZoneId } from '../../data/zones';
import type { CarrierPlayer } from './carrier-eligibility';
import { visualizationStarters } from './visualization';

const FOUR_BACK: readonly FormationSlot[] = [
  { id: 'DCL', family: 'D(C)', base: { x: 28, y: 75 } },
  { id: 'DCR', family: 'D(C)', base: { x: 48, y: 75 } },
];

const THREE_BACK: readonly FormationSlot[] = [
  { id: 'DCL', family: 'D(C)', base: { x: 20, y: 75 } },
  { id: 'DC', family: 'D(C)', base: { x: 38, y: 75 } },
  { id: 'DCR', family: 'D(C)', base: { x: 56, y: 75 } },
];

function player(
  id: string,
  roleId: string | undefined,
  family: Family | null,
  slot: SlotId | null,
  side?: 'left' | 'right',
): CarrierPlayer {
  return { id, roleId, family, slot, side };
}

function starters(zone: ZoneId, players: readonly CarrierPlayer[], slots = FOUR_BACK) {
  return visualizationStarters(zone, players, slots);
}

describe('visualizationStarters', () => {
  it('lists the eligible players in formation slot order', () => {
    const slots: readonly FormationSlot[] = [
      { id: 'WBR', family: 'WB(R)', base: { x: 60, y: 60 } },
      { id: 'AMR', family: 'AM(R)', base: { x: 60, y: 40 } },
    ];
    const winger = player('rw', 'winger_ip', 'AM(R)', 'AMR', 'right');
    const wingBack = player('rwb', 'wing_back_ip', 'WB(R)', 'WBR', 'right');
    expect(starters('R-F', [winger, wingBack], slots)).toEqual(['rwb', 'rw']);
  });

  it('returns nothing for a zone no player can carry in', () => {
    expect(starters('C-F', [player('lfb', 'full_back_ip', 'D(L)', 'DL', 'left')])).toEqual([]);
    expect(starters('C-F', [])).toEqual([]);
  });

  it('offers Advanced Wing-Back only from a wing-back slot', () => {
    const fromAttack = player('awb-am', 'advanced_wing_back_ip', 'AM(R)', 'AMR', 'right');
    const fromWingBack = player('awb', 'advanced_wing_back_ip', 'WB(R)', 'WBR', 'right');
    expect(starters('R-F', [fromAttack])).toEqual([]);
    expect(starters('R-F', [fromWingBack])).toEqual(['awb']);
  });

  it('mirrors side-specific roles and keeps central roles in the centre', () => {
    const leftWinger = player('lw', 'winger_ip', 'AM(L)', 'AML', 'left');
    const rightWinger = player('rw', 'winger_ip', 'AM(R)', 'AMR', 'right');
    const centralMidfielder = player('cm', 'central_midfielder_ip', 'M(C)', 'MCL');
    const players = [leftWinger, rightWinger, centralMidfielder];
    expect(starters('L-F', players)).toEqual(['lw']);
    expect(starters('R-F', players)).toEqual(['rw']);
    expect(starters('C-M', players)).toEqual(['cm']);
    expect(starters('LH-M', players)).toEqual([]);
  });

  it('offers an Overlapping Centre-Back only on the outermost slot of a three-back formation', () => {
    const left = player('locb', 'overlapping_centre_back_ip', 'D(C)', 'DCL', 'left');
    const middle = player('mocb', 'overlapping_centre_back_ip', 'D(C)', 'DC');
    const right = player('rocb', 'overlapping_centre_back_ip', 'D(C)', 'DCR', 'right');
    const players = [left, middle, right];
    expect(starters('L-D', players, THREE_BACK)).toEqual(['locb']);
    expect(starters('C-D', players, THREE_BACK)).toEqual(['locb', 'rocb']);
    expect(starters('L-D', [left], FOUR_BACK)).toEqual([]);
  });
});
