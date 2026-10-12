import type { LineShiftTable } from '../../data/types';
import type { ZoneId } from '../../data/zones';

export function lineShift(zone: ZoneId, table: LineShiftTable): number {
  return table[zone].dy;
}
