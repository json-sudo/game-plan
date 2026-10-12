import type { LineShiftTable } from '../types';

// First line-height move in Shape. Kept independently adjustable from the second
// line shift applied with role movement in Runs and Final.
export const SHAPE_LINE_SHIFT: LineShiftTable = {
  'L-D': { dy: 3, from: 'initial' },
  'L-M': { dy: 0, from: 'initial' },
  'L-F': { dy: -3, from: 'initial' },
  'LH-D': { dy: 3.5, from: 'initial' },
  'LH-M': { dy: 0, from: 'initial' },
  'LH-F': { dy: -3.5, from: 'initial' },
  'C-D': { dy: 4, from: 'initial' },
  'C-M': { dy: 0, from: 'initial' },
  'C-F': { dy: -4, from: 'initial' },
  'RH-D': { dy: 3.5, from: 'initial' },
  'RH-M': { dy: 0, from: 'initial' },
  'RH-F': { dy: -3.5, from: 'initial' },
  'R-D': { dy: 3, from: 'initial' },
  'R-M': { dy: 0, from: 'initial' },
  'R-F': { dy: -3, from: 'initial' },
};
