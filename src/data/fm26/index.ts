import type { DataSet } from '../types';
import { FORMATIONS } from './formations';
import { LINE_SHIFT } from './line-shift';
import { MOVEMENT } from './movement';
import { ROLES } from './roles';

export const DATA_VERSION = 'fm26-1';

export const FM26_DATA: DataSet = {
  version: DATA_VERSION,
  roles: ROLES,
  formations: FORMATIONS,
  movement: MOVEMENT,
  lineShift: LINE_SHIFT,
};

export { FORMATIONS, LINE_SHIFT, MOVEMENT, ROLES };
