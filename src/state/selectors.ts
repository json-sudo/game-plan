import { FM26_DATA } from '../data/fm26';
import type { Point, Side } from '../data/types';
import { PHASES, computePhases, type Phase } from '../engine';
import { phasePlayersOf } from './context';
import type { BoardDocument, Player } from './document';
import type { BoardStore, DragState } from './store';

export type PhasePositions = Record<Phase, Map<string, Point>>;

const phaseCache = new WeakMap<BoardDocument, PhasePositions>();
const teamCache = new WeakMap<BoardDocument, Record<Side, Player[]>>();
const dragCache = new WeakMap<DragState, { base: Map<string, Point>; result: Map<string, Point> }>();

function basePositions(doc: BoardDocument): PhasePositions {
  const base = new Map(
    doc.players.flatMap((player) => (player.base ? [[player.id, player.base] as const] : [])),
  );
  return Object.fromEntries(PHASES.map((phase) => [phase, base])) as PhasePositions;
}

function computeDocumentPhases(doc: BoardDocument): PhasePositions {
  if (!doc.scenario) return basePositions(doc);
  return computePhases({
    attacker: doc.attacker,
    players: phasePlayersOf(doc, FM26_DATA),
    ball: doc.ball,
    carrierId: doc.scenario.carrierId,
    tables: { movement: FM26_DATA.movement, lineShift: FM26_DATA.lineShift },
  });
}

export function selectPhasePositions(doc: BoardDocument): PhasePositions {
  const cached = phaseCache.get(doc);
  if (cached) return cached;
  const computed = computeDocumentPhases(doc);
  phaseCache.set(doc, computed);
  return computed;
}

export function selectTeamPlayers(doc: BoardDocument, team: Side): Player[] {
  const cached = teamCache.get(doc);
  if (cached) return cached[team];
  const grouped: Record<Side, Player[]> = {
    mine: doc.players.filter((player) => player.team === 'mine'),
    opponent: doc.players.filter((player) => player.team === 'opponent'),
  };
  teamCache.set(doc, grouped);
  return grouped[team];
}

export function selectDisplayPositions(state: BoardStore): Map<string, Point> {
  const positions = selectPhasePositions(state.doc)[state.ui.phase];
  const { drag } = state.ui;
  if (!drag || drag.target.kind !== 'player') return positions;
  const cached = dragCache.get(drag);
  if (cached?.base === positions) return cached.result;
  const result = new Map(positions).set(drag.target.id, drag.point);
  dragCache.set(drag, { base: positions, result });
  return result;
}

export function selectCanUndo(state: BoardStore): boolean {
  return state.history.past.length > 0;
}

export function selectCanRedo(state: BoardStore): boolean {
  return state.history.future.length > 0;
}
