import { FM26_DATA } from '../data/fm26';
import type { DataSet, Side } from '../data/types';
import type { ZoneId } from '../data/zones';
import { applyAction, type Action } from './actions';
import { DEFAULT_BENCH_FORMATIONS } from './bench-pieces';
import { createInitialDocument, playersOf, type PitchDocument } from './document';

export const EXAMPLE_FORMATIONS: Record<Side, string> = DEFAULT_BENCH_FORMATIONS;
export const EXAMPLE_ZONE: ZoneId = 'R-F';
export const EXAMPLE_CARRIER_SLOT = 'AMCR';

const EXAMPLE_ACTIONS: readonly Action[] = [
  { type: 'applyFormation', team: 'mine', formationId: EXAMPLE_FORMATIONS.mine },
  { type: 'applyFormation', team: 'opponent', formationId: EXAMPLE_FORMATIONS.opponent },
  { type: 'applyMatchup' },
  { type: 'fillDefaultRoles' },
  { type: 'tapZone', zone: EXAMPLE_ZONE },
];

export function createExampleDocument(data: DataSet = FM26_DATA): PitchDocument {
  const setUp = EXAMPLE_ACTIONS.reduce(
    (doc, action) => applyAction(doc, action, data),
    createInitialDocument(),
  );
  const carrier = playersOf(setUp, 'mine').find((player) => player.slot === EXAMPLE_CARRIER_SLOT);
  return carrier ? applyAction(setUp, { type: 'setCarrier', playerId: carrier.id }, data) : setUp;
}

function exampleCarrier(): string {
  const carrierId = createExampleDocument().scenario?.carrierId;
  if (!carrierId) throw new Error('the example tactic has no carrier');
  return carrierId;
}

export const EXAMPLE_CARRIER = exampleCarrier();
