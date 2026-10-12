import type { DataSet } from '../types';
import { FORMATIONS } from './formations';
import { LINE_SHIFT } from './line-shift';
import { SHAPE_LINE_SHIFT } from './shape-line-shift';
import { MOVEMENT } from './movement';
import { ROLES } from './roles';

export const DATA_VERSION = 'fm26-3';

export const FM26_DATA: DataSet = {
  version: DATA_VERSION,
  roles: ROLES,
  formations: FORMATIONS,
  movement: MOVEMENT,
  shapeLineShift: SHAPE_LINE_SHIFT,
  lineShift: LINE_SHIFT,
};

export { FORMATIONS, LINE_SHIFT, MOVEMENT, ROLES, SHAPE_LINE_SHIFT };
