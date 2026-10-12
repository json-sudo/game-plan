import type { LineShiftTable } from '../types';

// dy in pitch units, in the attacker frame: positive pushes the defending line up the pitch
// towards the attackers, negative drops it towards its own goal.
export const LINE_SHIFT: LineShiftTable = {
  'L-D': { dy: 3, from: 'initial' },
  'L-M': { dy: 0, from: 'initial' },
  'L-F': { dy: -3, from: 'initial' },
  'C-D': { dy: 4, from: 'initial' },
  'C-M': { dy: 0, from: 'initial' },
  'C-F': { dy: -4, from: 'initial' },
  'R-D': { dy: 3, from: 'initial' },
  'R-M': { dy: 0, from: 'initial' },
  'R-F': { dy: -3, from: 'initial' },
};
