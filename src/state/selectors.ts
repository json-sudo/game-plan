import type { Point, Side } from '../data/types';
import type { PitchDocument, Player } from './document';
import type { DragState, PitchStore } from './store';

const baseCache = new WeakMap<PitchDocument, Map<string, Point>>();
const teamCache = new WeakMap<PitchDocument, Record<Side, Player[]>>();
const dragCache = new WeakMap<
  DragState,
  { base: Map<string, Point>; result: Map<string, Point> }
>();

function selectBasePositions(doc: PitchDocument): Map<string, Point> {
  const cached = baseCache.get(doc);
  if (cached) return cached;
  const computed = new Map(
    doc.players.flatMap((player) => (player.base ? [[player.id, player.base] as const] : [])),
  );
  baseCache.set(doc, computed);
  return computed;
}

export function selectTeamPlayers(doc: PitchDocument, team: Side): Player[] {
  const cached = teamCache.get(doc);
  if (cached) return cached[team];
  const grouped: Record<Side, Player[]> = {
    mine: doc.players.filter((player) => player.team === 'mine'),
    opponent: doc.players.filter((player) => player.team === 'opponent'),
  };
  teamCache.set(doc, grouped);
  return grouped[team];
}

export function selectDisplayPositions(state: PitchStore): Map<string, Point> {
  const positions = selectBasePositions(state.doc);
  const { drag } = state.ui;
  if (!drag || drag.target.kind !== 'player') return positions;
  const cached = dragCache.get(drag);
  if (cached?.base === positions) return cached.result;
  const result = new Map(positions).set(drag.target.id, drag.point);
  dragCache.set(drag, { base: positions, result });
  return result;
}

export function selectCanUndo(state: PitchStore): boolean {
  return state.history.past.length > 0;
}

export function selectCanRedo(state: PitchStore): boolean {
  return state.history.future.length > 0;
}
