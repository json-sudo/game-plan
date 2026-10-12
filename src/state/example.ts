import { FM26_DATA } from '../data/fm26';
import type { DataSet, Side } from '../data/types';
import type { ZoneId } from '../data/zones';
import { applyAction, type Action } from './actions';
import { createInitialDocument, type PitchDocument } from './document';

export const EXAMPLE_FORMATIONS: Record<Side, string> = {
  mine: '4_3_3_dm_wide',
  opponent: '4_2_3_1_dm_wide',
};
export const EXAMPLE_ZONE: ZoneId = 'R-F';

const EXAMPLE_ACTIONS: readonly Action[] = [
  { type: 'applyFormation', team: 'mine', formationId: EXAMPLE_FORMATIONS.mine },
  { type: 'applyFormation', team: 'opponent', formationId: EXAMPLE_FORMATIONS.opponent },
  { type: 'applyMatchup' },
  { type: 'fillDefaultRoles' },
  { type: 'tapZone', zone: EXAMPLE_ZONE },
];

export function createExampleDocument(data: DataSet = FM26_DATA): PitchDocument {
  return EXAMPLE_ACTIONS.reduce(
    (doc, action) => applyAction(doc, action, data),
    createInitialDocument(),
  );
}
