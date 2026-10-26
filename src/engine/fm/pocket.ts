import type { Family, Point } from '../../data/types';
import type { Third, ZoneId } from '../../data/zones';
import { PITCH_W } from '../geometry/pitch';
import type { LateralSide } from './carrier-eligibility';
import { FLANK, HALF_SPACE } from './role-regions';
import { laneOf, laneSignOf, thirdOf } from './zones';

export interface PocketStarter {
  roleId: string | undefined;
  family: Family;
  side: LateralSide | undefined;
}

const CENTRE_X = PITCH_W / 2;
const HALF_BACK = 'half_back_ip';
const MIDFIELD_FAMILIES: readonly Family[] = ['M(C)', 'AM(C)'];

const FLANK_Y: Record<Third, number> = { D: 79, M: 49, F: 23 };
const HALF_SPACE_Y: Record<Third, number> = { D: 82, M: 49, F: 23 };
const MIDFIELD_HALF_SPACE_FINAL_Y = 27;
const CENTRE_PAIRED_X: Record<Third, number> = { D: 32, M: 34, F: 33 };
const CENTRE_Y: Record<Third, number> = { D: 82, M: 51, F: 21 };
const HALF_BACK_CENTRE_Y = 78;

function mirrored(x: number, sign: -1 | 0 | 1): number {
  return sign < 0 ? x : PITCH_W - x;
}

function pairedCentreX(third: Third, side: LateralSide | undefined): number {
  if (side === undefined) return CENTRE_X;
  return mirrored(CENTRE_PAIRED_X[third], side === 'left' ? -1 : 1);
}

export function pocketOf(zone: ZoneId, starter: PocketStarter): Point {
  const third = thirdOf(zone);
  const sign = laneSignOf(zone);
  const lane = laneOf(zone);
  if (lane === 'L' || lane === 'R') return { x: mirrored(FLANK, sign), y: FLANK_Y[third] };
  if (lane === 'LH' || lane === 'RH') {
    const isMidfielder = MIDFIELD_FAMILIES.includes(starter.family);
    const y = third === 'F' && isMidfielder ? MIDFIELD_HALF_SPACE_FINAL_Y : HALF_SPACE_Y[third];
    return { x: mirrored(HALF_SPACE, sign), y };
  }
  if (starter.roleId === HALF_BACK) return { x: CENTRE_X, y: HALF_BACK_CENTRE_Y };
  return { x: pairedCentreX(third, starter.side), y: CENTRE_Y[third] };
}
